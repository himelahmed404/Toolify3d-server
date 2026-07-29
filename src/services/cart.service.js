import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import {
  assertCustomOrderFileOwnership,
  assertValidFirebaseFileUrl,
  validateQuotePricing,
} from '../utils/customOrderValidation.js';
import { deleteCustomOrderFile } from './firebaseStorage.service.js';
import { getProductRaw, resolveColorImage } from './products.service.js';

const MAX_CUSTOM_TEXT_LENGTH = 20;

const COLOR_LABELS = {
  '#000000': 'Black',
  '#ffffff': 'White',
  '#1db954': 'Toolify Green',
  '#3d3d3d': 'Dark Gray',
  '#888888': 'Gray',
};

function formatCart(doc) {
  return {
    userId: doc.userId,
    items: doc.items || [],
    updatedAt: doc.updatedAt,
  };
}

function normalizeCustomText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, MAX_CUSTOM_TEXT_LENGTH);
}

function normalizeColorHex(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

function getColorHex(color) {
  if (typeof color === 'string') return normalizeColorHex(color);
  return normalizeColorHex(color?.hex);
}

function resolveColorLabel(hex, productColors = []) {
  const normalizedHex = normalizeColorHex(hex);
  const productColor = productColors.find(
    (color) => getColorHex(color) === normalizedHex
  );
  if (productColor && typeof productColor === 'object' && productColor.label) {
    return productColor.label;
  }
  if (typeof productColor === 'string') {
    return COLOR_LABELS[normalizedHex] || productColor;
  }
  return COLOR_LABELS[normalizedHex] || normalizedHex;
}

function normalizeLineItemColor({ colorHex, colorLabel }, product) {
  const normalizedHex = normalizeColorHex(colorHex);
  if (!normalizedHex) return null;

  const productColors = (product.colors || []).map(getColorHex);
  if (productColors.length && !productColors.includes(normalizedHex)) {
    throw new AppError('Selected color is not available for this product', 400, 'VALIDATION_ERROR');
  }

  return {
    hex: normalizedHex,
    label: String(colorLabel || resolveColorLabel(normalizedHex, product.colors || [])).trim(),
  };
}

function matchCustomCartItem(item, customItemId) {
  return item.itemType === 'custom' && item.customItemId === customItemId;
}

function matchCartItem(item, productId, customText = '', colorHex = '') {
  if (item.itemType === 'custom') return false;
  const normalizedCustomText = normalizeCustomText(customText);
  const itemText = normalizeCustomText(item.customText);
  const normalizedColorHex = normalizeColorHex(colorHex);
  const itemColorHex = normalizeColorHex(item.color?.hex);
  return (
    item.productId === productId &&
    itemText === normalizedCustomText &&
    itemColorHex === normalizedColorHex
  );
}

async function getCartDoc(userId) {
  const db = getDb();
  return db.collection('carts').findOne({ userId });
}

export async function getCart(userId) {
  const cart = await getCartDoc(userId);
  if (!cart) {
    return { userId, items: [], updatedAt: null };
  }
  return formatCart(cart);
}

export async function addOrUpdateCartItem(
  userId,
  { productId, quantity = 1, customText, colorHex, colorLabel }
) {
  if (!ObjectId.isValid(productId)) {
    throw new AppError('Invalid product id', 400, 'VALIDATION_ERROR');
  }

  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400, 'VALIDATION_ERROR');
  }

  const product = await getProductRaw(productId);
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  const normalizedCustomText = normalizeCustomText(customText);

  if (product.hasCustomText && !normalizedCustomText) {
    throw new AppError('Custom text is required for this product', 400, 'VALIDATION_ERROR');
  }

  const color = normalizeLineItemColor({ colorHex, colorLabel }, product);

  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });
  const now = new Date();

  const lineItem = {
    itemType: 'product',
    productId: product._id.toString(),
    quantity,
    unitPrice: product.price,
    name: product.name,
    image: resolveColorImage(product, color?.hex),
    tags: [product.material, product.weight].filter(Boolean),
  };

  if (normalizedCustomText) {
    lineItem.customText = normalizedCustomText;
  }

  if (color) {
    lineItem.color = color;
  }

  if (!cart) {
    await collection.insertOne({
      userId,
      items: [lineItem],
      updatedAt: now,
    });
    return getCart(userId);
  }

  const items = [...(cart.items || [])];
  const existingIndex = items.findIndex((item) =>
    matchCartItem(item, lineItem.productId, normalizedCustomText, color?.hex)
  );

  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity,
      image: lineItem.image,
      itemType: 'product',
    };
  } else {
    items.push(lineItem);
  }

  await collection.updateOne(
    { userId },
    { $set: { items, updatedAt: now } }
  );

  return getCart(userId);
}

export async function updateCartItemQuantity(
  userId,
  productId,
  quantity,
  customText = '',
  colorHex = ''
) {
  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });

  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  const items = cart.items || [];
  const index = items.findIndex((item) =>
    matchCartItem(item, productId, customText, colorHex)
  );

  if (index < 0) {
    throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  }

  items[index] = { ...items[index], quantity };

  await collection.updateOne(
    { userId },
    { $set: { items, updatedAt: new Date() } }
  );

  return getCart(userId);
}

export async function removeCartItem(userId, productId, customText = '', colorHex = '') {
  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });

  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  const items = (cart.items || []).filter(
    (item) => !matchCartItem(item, productId, customText, colorHex)
  );

  await collection.updateOne(
    { userId },
    { $set: { items, updatedAt: new Date() } }
  );

  return getCart(userId);
}

export async function clearCart(userId) {
  const db = getDb();
  await db.collection('carts').updateOne(
    { userId },
    { $set: { items: [], updatedAt: new Date() } },
    { upsert: true }
  );
  return getCart(userId);
}

export async function getCartItemsForCheckout(userId) {
  const cart = await getCartDoc(userId);
  if (!cart?.items?.length) {
    throw new AppError('Cart is empty', 400, 'EMPTY_CART');
  }
  return cart.items;
}

export async function addCustomCartItem(userId, payload) {
  const {
    fileName,
    fileUrl,
    storagePath,
    fileSize,
    fileType,
    material,
    volumeCm3,
    estimatedWeight,
    pricePerGram,
    totalCost,
    quantity = 1,
  } = payload;

  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400, 'VALIDATION_ERROR');
  }

  assertValidFirebaseFileUrl(fileUrl);
  assertCustomOrderFileOwnership(userId, { fileUrl, storagePath });

  const validatedQuote = await validateQuotePricing({
    material,
    volumeCm3,
    estimatedWeight,
    pricePerGram,
    totalCost,
  });

  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });
  const now = new Date();
  const customItemId = randomUUID();
  const filament = validatedQuote.material.name;

  const lineItem = {
    itemType: 'custom',
    customItemId,
    quantity,
    unitPrice: validatedQuote.totalCost,
    name: fileName,
    image: null,
    tags: [filament, `${validatedQuote.estimatedWeight}g`],
    fileName,
    fileUrl,
    storagePath: storagePath || null,
    fileSize: fileSize ?? null,
    fileType: fileType || null,
    material: validatedQuote.material,
    volumeCm3: volumeCm3 ?? null,
    estimatedWeight: validatedQuote.estimatedWeight,
    pricePerGram: validatedQuote.pricePerGram,
  };

  if (!cart) {
    await collection.insertOne({
      userId,
      items: [lineItem],
      updatedAt: now,
    });
    return getCart(userId);
  }

  const items = [...(cart.items || []), lineItem];
  await collection.updateOne({ userId }, { $set: { items, updatedAt: now } });
  return getCart(userId);
}

export async function updateCustomCartItemQuantity(userId, customItemId, quantity) {
  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });

  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  const items = cart.items || [];
  const index = items.findIndex((item) => matchCustomCartItem(item, customItemId));

  if (index < 0) {
    throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  }

  items[index] = { ...items[index], quantity };

  await collection.updateOne(
    { userId },
    { $set: { items, updatedAt: new Date() } }
  );

  return getCart(userId);
}

export async function removeCustomCartItem(userId, customItemId) {
  const db = getDb();
  const collection = db.collection('carts');
  const cart = await collection.findOne({ userId });

  if (!cart) {
    throw new AppError('Cart not found', 404, 'NOT_FOUND');
  }

  const items = cart.items || [];
  const removedItem = items.find((item) => matchCustomCartItem(item, customItemId));

  if (!removedItem) {
    throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  }

  const nextItems = items.filter((item) => !matchCustomCartItem(item, customItemId));

  await collection.updateOne(
    { userId },
    { $set: { items: nextItems, updatedAt: new Date() } }
  );

  if (removedItem.storagePath) {
    deleteCustomOrderFile(removedItem.storagePath).catch((err) => {
      console.error(`[cart] Failed to delete orphaned file ${removedItem.storagePath}:`, err.message);
    });
  }

  return getCart(userId);
}

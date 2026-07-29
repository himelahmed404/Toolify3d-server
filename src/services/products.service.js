import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const COLOR_LABELS = {
  '#000000': 'Black',
  '#ffffff': 'White',
  '#1db954': 'Toolify Green',
  '#3d3d3d': 'Dark Gray',
  '#888888': 'Gray',
};

function normalizeColorHex(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

export function normalizeColorEntry(entry, fallbackImage = null) {
  if (typeof entry === 'string') {
    const hex = normalizeColorHex(entry);
    if (!hex) return null;
    return {
      hex,
      label: COLOR_LABELS[hex] || hex,
      image: fallbackImage,
    };
  }

  if (!entry || typeof entry !== 'object') return null;

  const hex = normalizeColorHex(entry.hex);
  if (!hex) return null;

  const label = String(entry.label || COLOR_LABELS[hex] || hex).trim();
  const image = typeof entry.image === 'string' && entry.image.trim() ? entry.image.trim() : null;

  return { hex, label, image };
}

export function normalizeColors(colors = [], fallbackImage = null) {
  if (!Array.isArray(colors)) return [];

  return colors
    .map((entry) => normalizeColorEntry(entry, fallbackImage))
    .filter(Boolean);
}

function resolveImages(doc) {
  if (Array.isArray(doc.images) && doc.images.length > 0) {
    return doc.images.filter(Boolean);
  }
  return [doc.image, doc.modalImage].filter(
    (img, i, arr) => img && arr.indexOf(img) === i
  );
}

export function resolvePrimaryImage(doc) {
  const colors = normalizeColors(doc.colors);
  if (colors[0]?.image) return colors[0].image;
  return resolveImages(doc)[0] ?? doc.image ?? null;
}

export function resolveColorImage(doc, hex) {
  const normalizedHex = normalizeColorHex(hex);
  const colors = normalizeColors(doc.colors);
  const primary = resolvePrimaryImage(doc);

  if (!normalizedHex) return primary;

  const match = colors.find((color) => color.hex === normalizedHex);
  return match?.image || primary;
}

function formatProduct(doc) {
  const images = resolveImages(doc);
  const primaryImage = resolvePrimaryImage(doc);
  const colors = normalizeColors(doc.colors, primaryImage);
  const id = doc._id.toString();

  return {
    _id: id,
    id,
    productId: doc.productId ?? null,
    name: doc.name,
    price: doc.price,
    material: doc.material,
    category: doc.category,
    specs: doc.specs,
    weight: doc.weight,
    layerHeight: doc.layerHeight,
    printTime: doc.printTime,
    image: doc.image ?? primaryImage ?? images[0] ?? null,
    modalImage: doc.modalImage ?? images[1] ?? null,
    images,
    colors,
    featured: doc.featured ?? false,
    hasCustomText: doc.hasCustomText ?? false,
    available: doc.available ?? true,
    description: doc.description ?? '',
    createdAt: doc.createdAt,
  };
}

export async function listProducts({ category, material, sort, includeUnavailable }) {
  const db = getDb();
  const filter = {};

  if (category && category !== 'ALL') {
    filter.category = category.toUpperCase();
  }

  if (material) {
    filter.material = material;
  }

  if (!includeUnavailable) {
    filter.available = { $ne: false };
  }

  let cursor = db.collection('products').find(filter);

  switch (sort) {
    case 'price-asc':
      cursor = cursor.sort({ price: 1 });
      break;
    case 'price-desc':
      cursor = cursor.sort({ price: -1 });
      break;
    case 'newest':
      cursor = cursor.sort({ createdAt: -1 });
      break;
    default:
      cursor = cursor.sort({ featured: -1, createdAt: -1 });
      break;
  }

  const products = await cursor.toArray();
  return products.map(formatProduct);
}

export async function getProductById(id) {
  if (!ObjectId.isValid(id)) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  const db = getDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  return formatProduct(product);
}

export async function getProductRaw(id) {
  if (!ObjectId.isValid(id)) return null;
  const db = getDb();
  return db.collection('products').findOne({ _id: new ObjectId(id) });
}

const EDITABLE_FIELDS = [
  'name',
  'price',
  'material',
  'category',
  'specs',
  'weight',
  'layerHeight',
  'printTime',
  'image',
  'modalImage',
  'images',
  'colors',
  'featured',
  'hasCustomText',
  'available',
  'description',
  'productId',
];

function pickProductFields(input) {
  const doc = {};
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== undefined) {
      doc[field] = input[field];
    }
  }
  return doc;
}

function serializeColorsForStorage(colors = []) {
  return normalizeColors(colors).map(({ hex, label, image }) => ({
    hex,
    label,
    image: image || null,
  }));
}

function validateColors(colors = []) {
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new AppError('At least one color is required', 400, 'VALIDATION_ERROR');
  }

  const seen = new Set();

  for (const color of colors) {
    if (!color.hex) {
      throw new AppError('Each color must have a hex value', 400, 'VALIDATION_ERROR');
    }
    if (!color.image) {
      throw new AppError('Each color must have an image', 400, 'VALIDATION_ERROR');
    }
    if (seen.has(color.hex)) {
      throw new AppError('Duplicate color hex values are not allowed', 400, 'VALIDATION_ERROR');
    }
    seen.add(color.hex);
  }
}

function hasLegacyMedia(input) {
  return (
    (typeof input.image === 'string' && input.image.length > 0) ||
    (Array.isArray(input.images) && input.images.some(Boolean))
  );
}

function hasValidColorMedia(colors = []) {
  return colors.some((color) => color.hex && color.image);
}

// Keep legacy image/modalImage and canonical images[] in sync so both
// old and new clients receive consistent media data.
function syncImageFields(doc) {
  if (Array.isArray(doc.colors)) {
    doc.colors = serializeColorsForStorage(doc.colors);
    if (doc.colors[0]?.image) {
      doc.image = doc.colors[0].image;
    }
  }

  if (Array.isArray(doc.images) && doc.images.length > 0) {
    const images = doc.images.filter(Boolean);
    doc.images = images;
    if (doc.image === undefined) doc.image = images[0] ?? null;
    if (doc.modalImage === undefined) doc.modalImage = images[1] ?? null;
  } else if (doc.image !== undefined || doc.modalImage !== undefined) {
    doc.images = [doc.image, doc.modalImage].filter(
      (img, i, arr) => img && arr.indexOf(img) === i
    );
  }

  if (doc.image === undefined && doc.colors?.[0]?.image) {
    doc.image = doc.colors[0].image;
  }

  return doc;
}

export async function createProduct(input) {
  const normalizedColors = serializeColorsForStorage(input.colors || []);
  const hasImage = hasLegacyMedia(input) || hasValidColorMedia(normalizedColors);

  if (!hasImage) {
    throw new AppError(
      'At least one image is required (colors[].image or images[])',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (hasValidColorMedia(normalizedColors)) {
    validateColors(normalizedColors);
  }

  const db = getDb();
  const doc = syncImageFields({
    ...pickProductFields(input),
    category: input.category ? input.category.toUpperCase() : input.category,
    colors: normalizedColors,
    featured: input.featured ?? false,
    hasCustomText: input.hasCustomText ?? false,
    available: input.available ?? true,
    description: input.description ?? '',
    createdAt: new Date(),
  });

  const result = await db.collection('products').insertOne(doc);
  return formatProduct({ ...doc, _id: result.insertedId });
}

export async function updateProduct(id, input) {
  if (!ObjectId.isValid(id)) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  const updates = syncImageFields(pickProductFields(input));
  if (updates.category) {
    updates.category = updates.category.toUpperCase();
  }

  if (updates.colors !== undefined) {
    updates.colors = serializeColorsForStorage(updates.colors);
    if (hasValidColorMedia(updates.colors)) {
      validateColors(updates.colors);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  const updated = await db
    .collection('products')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

  if (!updated) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  return formatProduct(updated);
}

export async function deleteProduct(id) {
  if (!ObjectId.isValid(id)) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  const db = getDb();
  const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
}

export async function deleteAllProducts() {
  const db = getDb();
  const result = await db.collection('products').deleteMany({});
  return { deletedCount: result.deletedCount };
}

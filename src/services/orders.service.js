import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import {
  assertCustomOrderFileOwnership,
  assertValidFirebaseFileUrl,
  validateQuotePricing,
} from '../utils/customOrderValidation.js';
import { getCartItemsForCheckout, clearCart } from './cart.service.js';
import { sendOrderNotificationEmail } from './orderEmail.service.js';
import { emitOrderCreated } from '../realtime/orderEvents.js';

function generateOrderNumber() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${suffix}`;
}

async function validateCustomCartItemForCheckout(userId, item) {
  assertValidFirebaseFileUrl(item.fileUrl);
  assertCustomOrderFileOwnership(userId, {
    fileUrl: item.fileUrl,
    storagePath: item.storagePath,
  });

  const validatedQuote = await validateQuotePricing({
    material: item.material,
    volumeCm3: item.volumeCm3,
    estimatedWeight: item.estimatedWeight,
    pricePerGram: item.pricePerGram,
    totalCost: item.unitPrice,
  });

  return {
    ...item,
    unitPrice: validatedQuote.totalCost,
    estimatedWeight: validatedQuote.estimatedWeight,
    pricePerGram: validatedQuote.pricePerGram,
    material: validatedQuote.material,
    tags: [validatedQuote.material.name, `${validatedQuote.estimatedWeight}g`],
  };
}

async function prepareCheckoutItems(userId, items) {
  return Promise.all(
    items.map(async (item) => {
      if (item.itemType === 'custom') {
        return validateCustomCartItemForCheckout(userId, item);
      }
      return { ...item, itemType: item.itemType || 'product' };
    })
  );
}

function formatOrder(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    orderNumber: doc.orderNumber,
    items: doc.items,
    subtotal: doc.subtotal,
    currency: doc.currency,
    status: doc.status,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    shippingAddress: doc.shippingAddress,
    notes: doc.notes || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createOrderFromCart(userId, { shippingAddress, notes }) {
  if (!shippingAddress?.name || !shippingAddress?.phone || !shippingAddress?.address) {
    throw new AppError('Shipping address with name, phone, and address is required', 400, 'VALIDATION_ERROR');
  }

  const rawItems = await getCartItemsForCheckout(userId);
  const items = await prepareCheckoutItems(userId, rawItems);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const now = new Date();

  const order = {
    userId,
    orderNumber: generateOrderNumber(),
    items: items.map((item) => ({ ...item })),
    subtotal,
    currency: 'BDT',
    status: 'pending',
    paymentMethod: 'cod',
    paymentStatus: 'awaiting_confirmation',
    shippingAddress,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  const result = await db.collection('orders').insertOne(order);
  await clearCart(userId);

  // Fire-and-forget: admin notification must never block or fail the checkout.
  sendOrderNotificationEmail(order).catch((err) => {
    console.error(`[orders] Admin notification failed for ${order.orderNumber}:`, err.message);
  });

  emitOrderCreated({
    orderId: result.insertedId.toString(),
    orderNumber: order.orderNumber,
    type: 'product',
    status: order.status,
    userId: order.userId,
  });

  return formatOrder({ ...order, _id: result.insertedId });
}

export async function listOrders(userId, { status } = {}) {
  const db = getDb();
  const filter = { userId };

  if (status && status.toLowerCase() !== 'all') {
    filter.status = status.toLowerCase();
  }

  const orders = await db
    .collection('orders')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map(formatOrder);
}

export async function getOrderById(userId, orderId) {
  if (!ObjectId.isValid(orderId)) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const db = getDb();
  const order = await db.collection('orders').findOne({
    _id: new ObjectId(orderId),
    userId,
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  return formatOrder(order);
}

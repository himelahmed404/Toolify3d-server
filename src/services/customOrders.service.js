import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import {
  assertCustomOrderFileOwnership,
  assertValidFirebaseFileUrl,
  validateQuotePricing,
} from '../utils/customOrderValidation.js';
import { sendOrderNotificationEmail } from './orderEmail.service.js';
import { emitOrderCreated } from '../realtime/orderEvents.js';

const COLLECTION = 'CustomOrder';

function generateOrderNumber() {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CUS-${suffix}`;
}

function toOrderEmailPayload(order) {
  const tags = [
    order.material?.name ? `Material: ${order.material.name}` : null,
    order.estimatedWeight != null ? `Weight: ${order.estimatedWeight}g` : null,
    order.volumeCm3 != null ? `Volume: ${order.volumeCm3} cm³` : null,
    order.fileType ? `File type: ${order.fileType}` : null,
  ].filter(Boolean);

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentMethod: 'cod',
    paymentStatus: 'awaiting_confirmation',
    shippingAddress: {
      name: order.shippingAddress?.name || '',
      phone: order.shippingAddress?.phone || '',
      address: order.shippingAddress?.address || '',
    },
    items: [
      {
        name: `Custom 3D print — ${order.fileName || 'Unnamed file'}`,
        quantity: 1,
        unitPrice: order.totalCost ?? 0,
        tags,
      },
    ],
    subtotal: order.totalCost ?? 0,
    currency: order.currency || 'BDT',
    notes: order.fileUrl ? `Custom order file: ${order.fileUrl}` : '',
  };
}

function formatCustomOrder(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    orderNumber: doc.orderNumber,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    fileType: doc.fileType,
    storagePath: doc.storagePath,
    material: doc.material,
    volumeCm3: doc.volumeCm3,
    estimatedWeight: doc.estimatedWeight,
    pricePerGram: doc.pricePerGram,
    totalCost: doc.totalCost,
    currency: doc.currency,
    status: doc.status,
    shippingAddress: doc.shippingAddress || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createCustomOrder(userId, payload) {
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
    shippingAddress,
  } = payload;

  assertValidFirebaseFileUrl(fileUrl);

  assertCustomOrderFileOwnership(userId, { fileUrl, storagePath });

  const validatedQuote = await validateQuotePricing({
    material,
    volumeCm3,
    estimatedWeight,
    pricePerGram,
    totalCost,
  });

  const now = new Date();
  const order = {
    userId,
    orderNumber: generateOrderNumber(),
    fileName,
    fileUrl,
    storagePath: storagePath || null,
    fileSize: fileSize ?? null,
    fileType: fileType || null,
    material: validatedQuote.material,
    volumeCm3: volumeCm3 ?? null,
    estimatedWeight: validatedQuote.estimatedWeight,
    pricePerGram: validatedQuote.pricePerGram,
    totalCost: validatedQuote.totalCost,
    currency: 'BDT',
    status: 'pending',
    shippingAddress: shippingAddress || null,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  const result = await db.collection(COLLECTION).insertOne(order);

  // Fire-and-forget: admin notification must never block or fail the checkout.
  sendOrderNotificationEmail(toOrderEmailPayload(order)).catch((err) => {
    console.error(
      `[customOrders] Admin notification failed for ${order.orderNumber}:`,
      err.message
    );
  });

  emitOrderCreated({
    orderId: result.insertedId.toString(),
    orderNumber: order.orderNumber,
    type: 'custom',
    status: order.status,
    userId: order.userId,
  });

  return formatCustomOrder({ ...order, _id: result.insertedId });
}

export async function listCustomOrders(userId) {
  const db = getDb();
  const orders = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map(formatCustomOrder);
}

export async function getCustomOrderById(userId, orderId) {
  if (!ObjectId.isValid(orderId)) {
    throw new AppError('Custom order not found', 404, 'NOT_FOUND');
  }

  const db = getDb();
  const order = await db.collection(COLLECTION).findOne({
    _id: new ObjectId(orderId),
    userId,
  });

  if (!order) {
    throw new AppError('Custom order not found', 404, 'NOT_FOUND');
  }

  return formatCustomOrder(order);
}

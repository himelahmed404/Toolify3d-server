import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { emitOrderStatusChanged } from '../realtime/orderEvents.js';

const IN_PROGRESS_STATUSES = ['in-progress', 'in_progress', 'processing'];
const PACKAGING_STATUSES = ['packaging'];
const SHIPPED_STATUSES = ['shipped', 'done', 'completed'];
const REJECTED_STATUS = 'rejected';

const STATUS_TAB_FILTERS = {
  pending: { status: 'pending' },
  'in-progress': { status: { $in: IN_PROGRESS_STATUSES } },
  packaging: { status: { $in: PACKAGING_STATUSES } },
  shipped: { status: { $in: SHIPPED_STATUSES } },
  rejected: { status: REJECTED_STATUS },
};

const ALLOWED_STATUS_UPDATES = ['in-progress', 'packaging', 'shipped', 'rejected'];

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function endOfTodayUtc() {
  const start = startOfTodayUtc();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

async function countOrdersByStatus(db, collection, statusFilter) {
  return db.collection(collection).countDocuments(statusFilter);
}

function formatProductOrderRow(doc) {
  const firstItem = doc.items?.[0];
  const itemCount = doc.items?.length ?? 0;
  const isCustomFirst = firstItem?.itemType === 'custom';

  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    product:
      itemCount > 1
        ? `${itemCount} items`
        : firstItem?.name || firstItem?.fileName || 'Order',
    material: isCustomFirst
      ? firstItem?.material?.name || firstItem?.tags?.[0] || '—'
      : firstItem?.tags?.[0] || '—',
    price: doc.subtotal ?? 0,
    currency: doc.currency || 'BDT',
    status: doc.status,
    createdAt: doc.createdAt,
    type: 'product',
  };
}

function formatCustomOrderRow(doc) {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    product: doc.fileName || 'Custom print',
    material: doc.material?.name || '—',
    price: doc.totalCost ?? 0,
    currency: doc.currency || 'BDT',
    status: doc.status,
    createdAt: doc.createdAt,
    type: 'custom',
  };
}

export async function getDashboardData() {
  const db = getDb();
  const todayStart = startOfTodayUtc();
  const todayEnd = endOfTodayUtc();

  const [
    pendingOrders,
    pendingCustom,
    inProgressOrders,
    inProgressCustom,
    packagingOrders,
    packagingCustom,
    rejectedOrders,
    rejectedCustom,
    shippedTodayOrders,
    shippedTodayCustom,
    totalOrders,
    totalCustom,
    recentProductOrders,
    recentCustomOrders,
  ] = await Promise.all([
    countOrdersByStatus(db, 'orders', { status: 'pending' }),
    countOrdersByStatus(db, 'CustomOrder', { status: 'pending' }),
    countOrdersByStatus(db, 'orders', { status: { $in: IN_PROGRESS_STATUSES } }),
    countOrdersByStatus(db, 'CustomOrder', { status: { $in: IN_PROGRESS_STATUSES } }),
    countOrdersByStatus(db, 'orders', { status: { $in: PACKAGING_STATUSES } }),
    countOrdersByStatus(db, 'CustomOrder', { status: { $in: PACKAGING_STATUSES } }),
    countOrdersByStatus(db, 'orders', { status: REJECTED_STATUS }),
    countOrdersByStatus(db, 'CustomOrder', { status: REJECTED_STATUS }),
    countOrdersByStatus(db, 'orders', {
      status: { $in: SHIPPED_STATUSES },
      $or: [
        { updatedAt: { $gte: todayStart, $lt: todayEnd } },
        { updatedAt: { $exists: false }, createdAt: { $gte: todayStart, $lt: todayEnd } },
      ],
    }),
    countOrdersByStatus(db, 'CustomOrder', {
      status: { $in: SHIPPED_STATUSES },
      $or: [
        { updatedAt: { $gte: todayStart, $lt: todayEnd } },
        { updatedAt: { $exists: false }, createdAt: { $gte: todayStart, $lt: todayEnd } },
      ],
    }),
    db.collection('orders').countDocuments(),
    db.collection('CustomOrder').countDocuments(),
    db.collection('orders').find().sort({ createdAt: -1 }).limit(10).toArray(),
    db.collection('CustomOrder').find().sort({ createdAt: -1 }).limit(10).toArray(),
  ]);

  const recentOrders = [
    ...recentProductOrders.map(formatProductOrderRow),
    ...recentCustomOrders.map(formatCustomOrderRow),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return {
    stats: {
      pending: pendingOrders + pendingCustom,
      inProgress: inProgressOrders + inProgressCustom,
      packaging: packagingOrders + packagingCustom,
      rejected: rejectedOrders + rejectedCustom,
      shippedToday: shippedTodayOrders + shippedTodayCustom,
      totalOrders: totalOrders + totalCustom,
    },
    recentOrders,
  };
}

function formatOrderTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .toUpperCase();
}

function formatPlacedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function normalizeStatus(status) {
  if (!status) return 'pending';
  if (IN_PROGRESS_STATUSES.includes(status)) return 'in-progress';
  if (PACKAGING_STATUSES.includes(status)) return 'packaging';
  if (SHIPPED_STATUSES.includes(status)) return 'shipped';
  if (status === REJECTED_STATUS) return 'rejected';
  return status;
}

function splitAddressLines(address) {
  if (!address) return [];
  if (Array.isArray(address)) return address.filter(Boolean);
  return String(address)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getOrderCounts(db) {
  const [
    pendingOrders,
    pendingCustom,
    inProgressOrders,
    inProgressCustom,
    packagingOrders,
    packagingCustom,
    shippedOrders,
    shippedCustom,
    rejectedOrders,
    rejectedCustom,
  ] = await Promise.all([
    countOrdersByStatus(db, 'orders', STATUS_TAB_FILTERS.pending),
    countOrdersByStatus(db, 'CustomOrder', STATUS_TAB_FILTERS.pending),
    countOrdersByStatus(db, 'orders', STATUS_TAB_FILTERS['in-progress']),
    countOrdersByStatus(db, 'CustomOrder', STATUS_TAB_FILTERS['in-progress']),
    countOrdersByStatus(db, 'orders', STATUS_TAB_FILTERS.packaging),
    countOrdersByStatus(db, 'CustomOrder', STATUS_TAB_FILTERS.packaging),
    countOrdersByStatus(db, 'orders', STATUS_TAB_FILTERS.shipped),
    countOrdersByStatus(db, 'CustomOrder', STATUS_TAB_FILTERS.shipped),
    countOrdersByStatus(db, 'orders', STATUS_TAB_FILTERS.rejected),
    countOrdersByStatus(db, 'CustomOrder', STATUS_TAB_FILTERS.rejected),
  ]);

  return {
    pending: pendingOrders + pendingCustom,
    inProgress: inProgressOrders + inProgressCustom,
    packaging: packagingOrders + packagingCustom,
    shipped: shippedOrders + shippedCustom,
    rejected: rejectedOrders + rejectedCustom,
  };
}

function formatProductItems(items, productMap) {
  return (items || [])
    .map((item, serialIndex) => {
      if (item.itemType === 'custom') {
        return {
          index: serialIndex + 1,
          itemType: 'custom',
          name: item.name || item.fileName || 'Custom print',
          fileName: item.fileName || item.name || null,
          fileUrl: item.fileUrl || null,
          material: item.material?.name || item.tags?.[0] || '—',
          weight:
            item.estimatedWeight != null
              ? `${item.estimatedWeight}g`
              : item.tags?.[1] || '—',
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
        };
      }

      if (!item?.productId || !ObjectId.isValid(item.productId)) {
        return null;
      }

      const productMongoId = item.productId;
      const productDoc = productMap.get(productMongoId);
      return {
        index: serialIndex + 1,
        itemType: 'product',
        productMongoId,
        catalogProductId: productDoc?.productId || null,
        name: item.name || 'Product',
        customText: item.customText || '',
        color: item.color || null,
        material: item.tags?.[0] || productDoc?.material || '—',
        weight: item.tags?.[1] || productDoc?.weight || '—',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
      };
    })
    .filter(Boolean);
}

function formatAdminProductOrder(doc, userEmailMap, productMap, queuePosition) {
  const firstItem = doc.items?.[0];
  const orderItems = formatProductItems(doc.items, productMap);
  const productItems = orderItems.filter((item) => item.itemType === 'product');
  const firstProduct = productItems[0];
  const summaryItem = orderItems[0];
  const productDoc = firstProduct ? productMap.get(firstProduct.productMongoId) : null;
  const shipping = doc.shippingAddress || {};

  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    queuePosition,
    type: 'product',
    status: normalizeStatus(doc.status),
    timestamp: formatOrderTimestamp(doc.createdAt),
    placed: formatPlacedDate(doc.createdAt),
    product:
      orderItems.length > 1
        ? `${orderItems.length} items`
        : summaryItem?.name || firstItem?.name || 'Order',
    material: summaryItem?.material || firstItem?.tags?.[0] || productDoc?.material || '—',
    weight: summaryItem?.weight || firstItem?.tags?.[1] || productDoc?.weight || '—',
    qty: summaryItem?.quantity ?? firstItem?.quantity ?? 1,
    price: doc.subtotal ?? 0,
    currency: doc.currency || 'BDT',
    notes: doc.notes || '',
    orderItems,
    productItems,
    productMongoId: firstProduct?.productMongoId || null,
    catalogProductId: firstProduct?.catalogProductId || null,
    customer: {
      name: shipping.name || '—',
      email: userEmailMap.get(doc.userId) || '—',
      phone: shipping.phone || '—',
      address: splitAddressLines(shipping.address),
    },
    createdAt: doc.createdAt,
  };
}

function formatAdminCustomOrder(doc, userEmailMap, queuePosition) {
  const shipping = doc.shippingAddress || {};

  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    queuePosition,
    type: 'custom',
    status: normalizeStatus(doc.status),
    timestamp: formatOrderTimestamp(doc.createdAt),
    placed: formatPlacedDate(doc.createdAt),
    product: doc.fileName || 'Custom print',
    material: doc.material?.name || doc.material || '—',
    weight: doc.estimatedWeight != null ? `${doc.estimatedWeight}g` : '—',
    qty: 1,
    price: doc.totalCost ?? 0,
    currency: doc.currency || 'BDT',
    notes: '',
    orderItems: [
      {
        index: 1,
        itemType: 'custom',
        name: doc.fileName || 'Custom print',
        fileName: doc.fileName || null,
        fileUrl: doc.fileUrl || null,
        material: doc.material?.name || doc.material || '—',
        weight: doc.estimatedWeight != null ? `${doc.estimatedWeight}g` : '—',
        quantity: 1,
        unitPrice: doc.totalCost ?? 0,
      },
    ],
    productItems: [],
    fileName: doc.fileName || null,
    fileUrl: doc.fileUrl || null,
    customer: {
      name: shipping.name || '—',
      email: userEmailMap.get(doc.userId) || '—',
      phone: shipping.phone || '—',
      address: splitAddressLines(shipping.address),
    },
    createdAt: doc.createdAt,
  };
}

function combineFilters(baseFilter, extraFilter) {
  if (!extraFilter || Object.keys(extraFilter).length === 0) return baseFilter;
  return { $and: [baseFilter, extraFilter] };
}

async function getUserIdsMatchingSearch(db, search) {
  const trimmed = search?.trim();
  if (!trimmed) return [];

  const regex = { $regex: escapeRegex(trimmed), $options: 'i' };
  const users = await db.collection('user').find({ email: regex }).project({ _id: 1 }).toArray();
  return users.map((user) => user._id.toString());
}

function buildProductOrderSearchFilter(search, matchingUserIds = []) {
  const trimmed = search?.trim();
  if (!trimmed) return null;

  const regex = { $regex: escapeRegex(trimmed), $options: 'i' };
  const clauses = [
    { orderNumber: regex },
    { 'shippingAddress.name': regex },
    { 'shippingAddress.phone': regex },
    { 'items.name': regex },
    { 'items.fileName': regex },
    { notes: regex },
  ];

  if (matchingUserIds.length) {
    clauses.push({ userId: { $in: matchingUserIds } });
  }

  return { $or: clauses };
}

function buildCustomOrderSearchFilter(search, matchingUserIds = []) {
  const trimmed = search?.trim();
  if (!trimmed) return null;

  const regex = { $regex: escapeRegex(trimmed), $options: 'i' };
  const clauses = [
    { orderNumber: regex },
    { fileName: regex },
    { 'shippingAddress.name': regex },
    { 'shippingAddress.phone': regex },
    { 'material.name': regex },
    { material: regex },
  ];

  if (matchingUserIds.length) {
    clauses.push({ userId: { $in: matchingUserIds } });
  }

  return { $or: clauses };
}

export async function listAdminOrders({ status = 'pending', search = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const statusFilter = STATUS_TAB_FILTERS[status] || STATUS_TAB_FILTERS.pending;
  const matchingUserIds = await getUserIdsMatchingSearch(db, search);
  const productSearchFilter = buildProductOrderSearchFilter(search, matchingUserIds);
  const customSearchFilter = buildCustomOrderSearchFilter(search, matchingUserIds);
  const productFilter = combineFilters(statusFilter, productSearchFilter);
  const customFilter = combineFilters(statusFilter, customSearchFilter);

  const [productOrders, customOrders, counts] = await Promise.all([
    db.collection('orders').find(productFilter).sort({ createdAt: 1 }).toArray(),
    db.collection('CustomOrder').find(customFilter).sort({ createdAt: 1 }).toArray(),
    getOrderCounts(db),
  ]);

  const merged = [
    ...productOrders.map((doc) => ({ doc, type: 'product' })),
    ...customOrders.map((doc) => ({ doc, type: 'custom' })),
  ].sort((a, b) => new Date(a.doc.createdAt) - new Date(b.doc.createdAt));

  const total = merged.length;
  const page = merged.slice(safeOffset, safeOffset + safeLimit);

  const userIds = [...new Set(page.map(({ doc }) => doc.userId).filter(Boolean))];
  const productMongoIds = [
    ...new Set(
      page
        .filter(({ type }) => type === 'product')
        .flatMap(({ doc }) => (doc.items || []).map((item) => item.productId))
        .filter((id) => id && ObjectId.isValid(id))
    ),
  ];

  const validUserIds = userIds.filter((id) => ObjectId.isValid(id));

  const [users, products] = await Promise.all([
    validUserIds.length
      ? db
          .collection('user')
          .find({ _id: { $in: validUserIds.map((id) => new ObjectId(id)) } })
          .project({ email: 1 })
          .toArray()
      : [],
    productMongoIds.length
      ? db
          .collection('products')
          .find({ _id: { $in: productMongoIds.map((id) => new ObjectId(id)) } })
          .project({ productId: 1, material: 1, weight: 1 })
          .toArray()
      : [],
  ]);

  const userEmailMap = new Map(users.map((user) => [user._id.toString(), user.email || '']));
  const productMap = new Map(
    products.map((product) => [
      product._id.toString(),
      {
        productId: product.productId ?? null,
        material: product.material,
        weight: product.weight,
      },
    ])
  );

  const orders = page.map(({ doc, type }, index) => {
    const queuePosition = safeOffset + index + 1;
    return type === 'product'
      ? formatAdminProductOrder(doc, userEmailMap, productMap, queuePosition)
      : formatAdminCustomOrder(doc, userEmailMap, queuePosition);
  });

  return {
    orders,
    counts,
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function updateOrderStatus({ orderId, type, status }) {
  if (!ObjectId.isValid(orderId)) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (!['product', 'custom'].includes(type)) {
    throw new AppError('type must be product or custom', 400, 'VALIDATION_ERROR');
  }

  if (!ALLOWED_STATUS_UPDATES.includes(status)) {
    throw new AppError('status must be in-progress, packaging, shipped, or rejected', 400, 'VALIDATION_ERROR');
  }

  const collection = type === 'product' ? 'orders' : 'CustomOrder';
  const db = getDb();
  const result = await db.collection(collection).findOneAndUpdate(
    { _id: new ObjectId(orderId) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const normalizedStatus = normalizeStatus(result.status);

  emitOrderStatusChanged({
    orderId: result._id.toString(),
    orderNumber: result.orderNumber,
    type,
    status: normalizedStatus,
    userId: result.userId,
  });

  return {
    id: result._id.toString(),
    type,
    status: normalizedStatus,
  };
}

function buildCustomerSearchMatch(search) {
  if (!search?.trim()) return null;

  const regex = { $regex: escapeRegex(search.trim()), $options: 'i' };
  return {
    $or: [
      { name: regex },
      { email: regex },
      { phone: regex },
      { 'profile.name': regex },
      { 'profile.phone': regex },
    ],
  };
}

function formatCustomerRow(doc) {
  const profile = doc.profile || {};
  const userId = doc.userId || doc.id || doc._id?.toString?.() || '';
  return {
    id: userId,
    name: doc.name || profile.name || '',
    email: doc.email || '',
    phone: doc.phone || profile.phone || '',
    location: profile.address || profile.location || '',
    orderCount: (doc.productOrderCount ?? 0) + (doc.customOrderCount ?? 0),
    joinedAt: doc.createdAt,
  };
}

function buildCustomerAggregationPipeline(search = '') {
  const pipeline = [
    { $match: { role: { $ne: 'admin' } } },
    {
      $addFields: {
        userId: { $toString: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'profiles',
        localField: 'userId',
        foreignField: 'userId',
        as: 'profileDocs',
      },
    },
    {
      $addFields: {
        profile: { $arrayElemAt: ['$profileDocs', 0] },
      },
    },
    {
      $lookup: {
        from: 'orders',
        let: { uid: '$userId' },
        pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$uid'] } } }, { $count: 'count' }],
        as: 'productOrderStats',
      },
    },
    {
      $lookup: {
        from: 'CustomOrder',
        let: { uid: '$userId' },
        pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$uid'] } } }, { $count: 'count' }],
        as: 'customOrderStats',
      },
    },
    {
      $addFields: {
        productOrderCount: {
          $ifNull: [{ $arrayElemAt: ['$productOrderStats.count', 0] }, 0],
        },
        customOrderCount: {
          $ifNull: [{ $arrayElemAt: ['$customOrderStats.count', 0] }, 0],
        },
      },
    },
  ];

  const searchMatch = buildCustomerSearchMatch(search);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  return pipeline;
}

export async function listAllCustomersForExport() {
  const db = getDb();
  const pipeline = [
    ...buildCustomerAggregationPipeline(),
    { $sort: { createdAt: -1 } },
    { $limit: 10000 },
    {
      $project: {
        _id: 1,
        userId: 1,
        name: 1,
        email: 1,
        phone: 1,
        createdAt: 1,
        profile: 1,
        productOrderCount: 1,
        customOrderCount: 1,
      },
    },
  ];

  const rows = await db.collection('user').aggregate(pipeline).toArray();
  return rows.map(formatCustomerRow);
}

export async function listCustomers({ search = '', limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const pipeline = buildCustomerAggregationPipeline(search);

  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: safeOffset },
    { $limit: safeLimit },
    {
      $project: {
        _id: 1,
        userId: 1,
        name: 1,
        email: 1,
        phone: 1,
        createdAt: 1,
        profile: 1,
        productOrderCount: 1,
        customOrderCount: 1,
      },
    },
  ];

  const [countResult, rows] = await Promise.all([
    db.collection('user').aggregate(countPipeline).toArray(),
    db.collection('user').aggregate(dataPipeline).toArray(),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    customers: rows.map(formatCustomerRow),
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
}

import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { ensureSiteSettings } from './siteSettings.service.js';

const COLLECTION = 'materials';

const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock'];

function formatMaterial(doc) {
  return {
    slug: doc.slug,
    quoteId: doc.quoteId,
    name: doc.name,
    displayTag: doc.displayTag || '',
    density: doc.density,
    stockStatus: doc.stockStatus,
    stockKg: doc.stockKg ?? 0,
    discountEnabled: Boolean(doc.discountEnabled),
    tiers: doc.tiers || [],
    sortOrder: doc.sortOrder ?? 0,
    updatedAt: doc.updatedAt,
  };
}

function validateTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length !== 2) {
    throw new AppError('Material must have exactly 2 pricing tiers', 400, 'VALIDATION_ERROR');
  }

  const expectedMax = [50, 100];
  tiers.forEach((tier, index) => {
    if (tier.maxWeightG !== expectedMax[index]) {
      throw new AppError(`Tier ${index + 1} has invalid maxWeightG`, 400, 'VALIDATION_ERROR');
    }
    for (const field of ['regularPricePerGram', 'discountedPricePerGram']) {
      const value = Number(tier[field]);
      if (!Number.isFinite(value) || value < 0) {
        throw new AppError(`${field} must be a non-negative number`, 400, 'VALIDATION_ERROR');
      }
    }
  });
}

export async function listPublicMaterials() {
  const db = getDb();
  const [materials, settings] = await Promise.all([
    db.collection(COLLECTION).find({}).sort({ sortOrder: 1, name: 1 }).toArray(),
    ensureSiteSettings(),
  ]);

  return {
    discountsEnabled: Boolean(settings.discountsEnabled),
    weightBreakpointsG: settings.weightBreakpointsG || [50, 100],
    materials: materials.map(formatMaterial),
  };
}

export async function listAdminMaterials() {
  const db = getDb();
  const materials = await db
    .collection(COLLECTION)
    .find({})
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  return materials.map(formatMaterial);
}

export async function getMaterialBySlug(slug) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).findOne({ slug });
  if (!doc) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }
  return formatMaterial(doc);
}

export async function getMaterialByQuoteId(quoteId) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).findOne({ quoteId });
  if (!doc) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }
  return doc;
}

export async function updateMaterial(slug, payload = {}) {
  const db = getDb();
  const existing = await db.collection(COLLECTION).findOne({ slug });
  if (!existing) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  const updates = { updatedAt: new Date() };

  if (payload.tiers !== undefined) {
    validateTiers(payload.tiers);
    updates.tiers = payload.tiers.map((tier) => ({
      maxWeightG: tier.maxWeightG,
      regularPricePerGram: Number(tier.regularPricePerGram),
      discountedPricePerGram: Number(tier.discountedPricePerGram),
    }));
  }

  if (payload.stockStatus !== undefined) {
    if (!STOCK_STATUSES.includes(payload.stockStatus)) {
      throw new AppError('Invalid stock status', 400, 'VALIDATION_ERROR');
    }
    updates.stockStatus = payload.stockStatus;
  }

  if (payload.stockKg !== undefined) {
    const stockKg = Number(payload.stockKg);
    if (!Number.isFinite(stockKg) || stockKg < 0) {
      throw new AppError('stockKg must be a non-negative number', 400, 'VALIDATION_ERROR');
    }
    updates.stockKg = stockKg;
  }

  if (payload.discountEnabled !== undefined) {
    updates.discountEnabled = Boolean(payload.discountEnabled);
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { slug },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return formatMaterial(result);
}

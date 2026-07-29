import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { buildWhatsAppUrl } from '../utils/quotePricing.js';

const COLLECTION = 'site_settings';
const GLOBAL_ID = 'global';

const DEFAULT_SETTINGS = {
  _id: GLOBAL_ID,
  weightBreakpointsG: [50, 100],
  discountsEnabled: true,
  whatsappNumber: '',
  updatedAt: new Date(),
};

function formatPublicSettings(doc) {
  const whatsappNumber = doc.whatsappNumber || '';
  return {
    weightBreakpointsG: doc.weightBreakpointsG || [50, 100],
    discountsEnabled: Boolean(doc.discountsEnabled),
    whatsappNumber,
    whatsappUrl: buildWhatsAppUrl(whatsappNumber),
  };
}

function formatAdminSettings(doc) {
  return {
    weightBreakpointsG: doc.weightBreakpointsG || [50, 100],
    discountsEnabled: Boolean(doc.discountsEnabled),
    whatsappNumber: doc.whatsappNumber || '',
    whatsappUrl: buildWhatsAppUrl(doc.whatsappNumber),
    updatedAt: doc.updatedAt,
  };
}

export async function ensureSiteSettings() {
  const db = getDb();
  const existing = await db.collection(COLLECTION).findOne({ _id: GLOBAL_ID });
  if (existing) return existing;

  const now = new Date();
  const doc = { ...DEFAULT_SETTINGS, updatedAt: now };
  await db.collection(COLLECTION).insertOne(doc);
  return doc;
}

export async function getPublicSiteSettings() {
  const db = getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: GLOBAL_ID });
  return formatPublicSettings(doc || DEFAULT_SETTINGS);
}

export async function getAdminSiteSettings() {
  const doc = await ensureSiteSettings();
  return formatAdminSettings(doc);
}

export async function updateSiteSettings(payload = {}) {
  const db = getDb();
  await ensureSiteSettings();

  const updates = { updatedAt: new Date() };

  if (payload.discountsEnabled !== undefined) {
    updates.discountsEnabled = Boolean(payload.discountsEnabled);
  }

  if (payload.whatsappNumber !== undefined) {
    const digits = String(payload.whatsappNumber).replace(/\D/g, '');
    if (digits && digits.length < 8) {
      throw new AppError('WhatsApp number must include a valid country code', 400, 'VALIDATION_ERROR');
    }
    updates.whatsappNumber = digits;
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: GLOBAL_ID },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return formatAdminSettings(result);
}

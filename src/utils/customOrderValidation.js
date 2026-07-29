import { AppError } from './AppError.js';
import { calculateQuotePricing } from './quotePricing.js';
import { getMaterialByQuoteId } from '../services/materials.service.js';
import { ensureSiteSettings } from '../services/siteSettings.service.js';

export const PRICE_TOLERANCE_BDT = 0.5;
export const WEIGHT_TOLERANCE_G = 0.2;
export const FIREBASE_URL_PREFIX = 'https://firebasestorage.googleapis.com/';
export const CUSTOM_ORDERS_PREFIX = 'custom-orders/';

export function assertCustomOrderFileOwnership(userId, { fileUrl, storagePath }) {
  const expectedPrefix = `${CUSTOM_ORDERS_PREFIX}${userId}/`;

  if (typeof storagePath !== 'string' || !storagePath.startsWith(expectedPrefix)) {
    throw new AppError('File storage path does not belong to this user', 400, 'VALIDATION_ERROR');
  }

  let decodedPath;
  try {
    const url = new URL(fileUrl);
    const encodedPath = url.pathname.match(/\/o\/(.+)$/)?.[1];
    if (!encodedPath) {
      throw new Error('missing path');
    }
    decodedPath = decodeURIComponent(encodedPath);
  } catch {
    throw new AppError('Invalid Firebase Storage file URL', 400, 'VALIDATION_ERROR');
  }

  if (!decodedPath.startsWith(expectedPrefix)) {
    throw new AppError('File URL does not belong to this user', 400, 'VALIDATION_ERROR');
  }

  if (decodedPath !== storagePath) {
    throw new AppError('File URL and storage path do not match', 400, 'VALIDATION_ERROR');
  }
}

export function assertValidFirebaseFileUrl(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith(FIREBASE_URL_PREFIX)) {
    throw new AppError('A valid Firebase Storage file URL is required', 400, 'VALIDATION_ERROR');
  }
}

export async function validateQuotePricing({
  material,
  volumeCm3,
  estimatedWeight,
  pricePerGram,
  totalCost,
}) {
  if (!material?.id) {
    throw new AppError('A valid material selection is required', 400, 'VALIDATION_ERROR');
  }

  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
    throw new AppError('A valid model volume is required', 400, 'VALIDATION_ERROR');
  }

  const [materialDoc, settings] = await Promise.all([
    getMaterialByQuoteId(material.id),
    ensureSiteSettings(),
  ]);

  const pricing = calculateQuotePricing({
    volumeCm3,
    density: materialDoc.density,
    tiers: materialDoc.tiers,
    breakpoints: settings.weightBreakpointsG || [50, 100],
    discountsEnabled: settings.discountsEnabled,
    materialDiscountEnabled: materialDoc.discountEnabled,
  });

  const clientTotal = Number(totalCost);
  if (!Number.isFinite(clientTotal) || Math.abs(pricing.totalCost - clientTotal) > PRICE_TOLERANCE_BDT) {
    throw new AppError(
      'Quote total does not match current pricing. Please refresh the calculator and try again.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (
    estimatedWeight != null &&
    Number.isFinite(Number(estimatedWeight)) &&
    Math.abs(pricing.estimatedWeight - Number(estimatedWeight)) > WEIGHT_TOLERANCE_G
  ) {
    throw new AppError(
      'Estimated weight does not match current pricing. Please refresh the calculator and try again.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (
    pricePerGram != null &&
    Number.isFinite(Number(pricePerGram)) &&
    Math.abs(pricing.pricePerGram - Number(pricePerGram)) > 0.01
  ) {
    throw new AppError(
      'Price per gram does not match current pricing. Please refresh the calculator and try again.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return {
    estimatedWeight: pricing.estimatedWeight,
    pricePerGram: pricing.pricePerGram,
    totalCost: pricing.totalCost,
    material: {
      id: materialDoc.quoteId,
      name: materialDoc.name,
    },
  };
}

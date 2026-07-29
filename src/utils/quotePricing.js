const DEFAULT_BREAKPOINTS = [50, 100];

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function resolveTierIndex(weightG, breakpoints = DEFAULT_BREAKPOINTS) {
  if (weightG <= breakpoints[0]) return 0;
  return 1;
}

export function calculateQuotePricing({
  volumeCm3,
  density,
  tiers,
  breakpoints = DEFAULT_BREAKPOINTS,
  discountsEnabled = false,
  materialDiscountEnabled = false,
}) {
  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) {
    throw new Error('Invalid volume for quote calculation');
  }

  const weight = volumeCm3 * density;
  const tierIndex = resolveTierIndex(weight, breakpoints);
  const tier = tiers[tierIndex];

  if (!tier) {
    throw new Error('Material pricing tier not configured');
  }

  const regularRate = tier.regularPricePerGram;
  const discountedRate = tier.discountedPricePerGram;
  const discountApplied = Boolean(discountsEnabled && materialDiscountEnabled);
  const rate = discountApplied ? discountedRate : regularRate;
  const estimatedWeight = round2(weight);
  const totalCost = round2(weight * rate);
  const regularTotal = round2(weight * regularRate);

  return {
    estimatedWeight,
    totalCost,
    regularTotal,
    pricePerGram: round2(rate),
    discountApplied,
    tierIndex,
  };
}

export function buildWhatsAppUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

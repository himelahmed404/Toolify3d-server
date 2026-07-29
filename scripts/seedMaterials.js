import { connectDb, closeDb, getDb } from '../src/config/db.js';

const MATERIALS = [
  {
    slug: 'pla-plus',
    quoteId: 'PLA',
    name: 'PLA+ High Toughness',
    displayTag: 'Precision',
    density: 1.24,
    stockStatus: 'in_stock',
    stockKg: 80,
    discountEnabled: true,
    tiers: [
      { maxWeightG: 50, regularPricePerGram: 8.0, discountedPricePerGram: 7.0 },
      { maxWeightG: 100, regularPricePerGram: 7.5, discountedPricePerGram: 6.5 },
    ],
    sortOrder: 0,
  },
  {
    slug: 'petg-industrial',
    quoteId: 'PETG',
    name: 'PETG Industrial',
    displayTag: 'Tough',
    density: 1.27,
    stockStatus: 'low_stock',
    stockKg: 12,
    discountEnabled: true,
    tiers: [
      { maxWeightG: 50, regularPricePerGram: 10.0, discountedPricePerGram: 8.5 },
      { maxWeightG: 100, regularPricePerGram: 9.0, discountedPricePerGram: 7.5 },
    ],
    sortOrder: 1,
  },
  {
    slug: 'tpu-95a',
    quoteId: 'TPU',
    name: 'TPU 95A Flexible',
    displayTag: 'Flex',
    density: 1.21,
    stockStatus: 'out_of_stock',
    stockKg: 0,
    discountEnabled: true,
    tiers: [
      { maxWeightG: 50, regularPricePerGram: 14.0, discountedPricePerGram: 12.0 },
      { maxWeightG: 100, regularPricePerGram: 13.0, discountedPricePerGram: 11.0 },
    ],
    sortOrder: 2,
  },
];

const SITE_SETTINGS = {
  _id: 'global',
  weightBreakpointsG: [50, 100],
  discountsEnabled: true,
  whatsappNumber: '',
};

async function seed() {
  await connectDb();
  const db = getDb();
  const now = new Date();

  for (const material of MATERIALS) {
    await db.collection('materials').updateOne(
      { slug: material.slug },
      {
        $set: { ...material, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    console.log(`Seeded material: ${material.slug}`);
  }

  await db.collection('site_settings').updateOne(
    { _id: 'global' },
    {
      $setOnInsert: { ...SITE_SETTINGS, createdAt: now },
      $set: { updatedAt: now },
    },
    { upsert: true }
  );
  console.log('Seeded site_settings global doc');

  await closeDb();
  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

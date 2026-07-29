import { connectDb, closeDb, getDb } from '../src/config/db.js';

async function migrate() {
  await connectDb();
  const db = getDb();
  const materials = await db.collection('materials').find({}).toArray();

  let migrated = 0;
  for (const material of materials) {
    const tiers = material.tiers || [];
    if (tiers.length <= 2) {
      console.log(`Skipped ${material.slug}: already has ${tiers.length} tier(s)`);
      continue;
    }

    const nextTiers = tiers.slice(0, 2);
    await db.collection('materials').updateOne(
      { slug: material.slug },
      { $set: { tiers: nextTiers, updatedAt: new Date() } }
    );
    migrated += 1;
    console.log(`Migrated ${material.slug}: ${tiers.length} tiers -> 2 tiers`);
  }

  await closeDb();
  console.log(`Done. Migrated ${migrated} material(s).`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

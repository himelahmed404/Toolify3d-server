import { connectDb, closeDb, getDb } from '../src/config/db.js';

const COLLECTIONS = ['orders', 'CustomOrder'];
const LEGACY_SHIPPED = ['done', 'completed'];

async function migrate() {
  await connectDb();
  const db = getDb();
  const now = new Date();

  for (const collection of COLLECTIONS) {
    const result = await db.collection(collection).updateMany(
      { status: { $in: LEGACY_SHIPPED } },
      { $set: { status: 'shipped', updatedAt: now } }
    );
    console.log(`${collection}: migrated ${result.modifiedCount} orders to shipped`);
  }

  await closeDb();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

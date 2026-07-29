import { getDb } from '../config/db.js';
import { getFirebaseStorage } from '../config/firebase.js';
import { AppError } from '../utils/AppError.js';

const BATCH_SIZE = 50;
const CUSTOM_ORDERS_PREFIX = 'custom-orders/';

function isNotFoundError(err) {
  const code = err?.code;
  return code === 404 || code === 'storage/object-not-found' || code === 412;
}

function getStorage() {
  try {
    return getFirebaseStorage();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || 'Failed to initialize Firebase', 500, 'FIREBASE_ERROR');
  }
}

/**
 * Lists custom-order files in Firebase Storage and sums their sizes.
 * Falls back to MongoDB CustomOrder.fileSize if Firebase is unavailable.
 */
export async function getCustomOrderStorageStats() {
  const db = getDb();

  const mongoAgg = await db
    .collection('CustomOrder')
    .aggregate([
      {
        $match: {
          storagePath: { $type: 'string', $ne: '' },
        },
      },
      {
        $group: {
          _id: null,
          fileCount: { $sum: 1 },
          totalBytes: { $sum: { $ifNull: ['$fileSize', 0] } },
        },
      },
    ])
    .toArray();

  const mongoStats = {
    fileCount: mongoAgg[0]?.fileCount ?? 0,
    totalBytes: mongoAgg[0]?.totalBytes ?? 0,
  };

  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: CUSTOM_ORDERS_PREFIX });

    let totalBytes = 0;
    for (const file of files) {
      const size = Number(file.metadata?.size ?? 0);
      if (Number.isFinite(size)) totalBytes += size;
    }

    return {
      fileCount: files.length,
      totalBytes,
      source: 'firebase',
      trackedInMongo: mongoStats.fileCount,
      trackedBytesInMongo: mongoStats.totalBytes,
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'FIREBASE_NOT_CONFIGURED') {
      return {
        ...mongoStats,
        source: 'mongo',
        warning: err.message,
      };
    }

    return {
      ...mongoStats,
      source: 'mongo',
      warning: err.message || 'Could not read Firebase Storage; showing MongoDB estimates.',
    };
  }
}

export async function deleteAllCustomOrderStlFiles() {
  const db = getDb();
  const docs = await db
    .collection('CustomOrder')
    .find({ storagePath: { $type: 'string', $ne: '' } })
    .project({ storagePath: 1 })
    .toArray();

  const paths = [
    ...new Set(
      docs
        .map((doc) => doc.storagePath?.trim())
        .filter((path) => path && path.startsWith(CUSTOM_ORDERS_PREFIX))
    ),
  ];

  if (paths.length === 0) {
    return { deletedCount: 0, failedCount: 0, failedPaths: [] };
  }

  let storage;
  try {
    storage = getFirebaseStorage();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || 'Failed to initialize Firebase', 500, 'FIREBASE_ERROR');
  }

  const bucket = storage.bucket();
  let deletedCount = 0;
  let failedCount = 0;
  const failedPaths = [];

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((path) => bucket.file(path).delete())
    );

    results.forEach((result, index) => {
      const path = batch[index];
      if (result.status === 'fulfilled' || isNotFoundError(result.reason)) {
        deletedCount += 1;
      } else {
        failedCount += 1;
        failedPaths.push(path);
      }
    });
  }

  return { deletedCount, failedCount, failedPaths };
}

export async function deleteCustomOrderFile(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return false;

  const trimmedPath = storagePath.trim();
  if (!trimmedPath.startsWith(CUSTOM_ORDERS_PREFIX)) {
    throw new AppError('Invalid custom order storage path', 400, 'VALIDATION_ERROR');
  }

  const storage = getStorage();
  const bucket = storage.bucket();

  try {
    await bucket.file(trimmedPath).delete();
    return true;
  } catch (err) {
    if (isNotFoundError(err)) return true;
    throw err;
  }
}

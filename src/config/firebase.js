import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppError } from '../utils/AppError.js';

let initialized = false;

function initializeFirebase() {
  if (initialized || getApps().length) {
    initialized = true;
    return;
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new AppError(
      'FIREBASE_STORAGE_BUCKET is not configured',
      500,
      'FIREBASE_NOT_CONFIGURED'
    );
  }

  let credential;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      credential = cert(JSON.parse(serviceAccountJson));
    } catch {
      throw new AppError(
        'FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON',
        500,
        'FIREBASE_NOT_CONFIGURED'
      );
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credentialsPath = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      credential = cert(JSON.parse(readFileSync(credentialsPath, 'utf8')));
    } catch (err) {
      throw new AppError(
        `Failed to load Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS: ${err.message}`,
        500,
        'FIREBASE_NOT_CONFIGURED'
      );
    }
  } else {
    throw new AppError(
      'Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.',
      500,
      'FIREBASE_NOT_CONFIGURED'
    );
  }

  initializeApp({ credential, storageBucket });
  initialized = true;
}

export function getFirebaseStorage() {
  initializeFirebase();
  return getStorage();
}

export function getFirebaseAuth() {
  initializeFirebase();
  return getAuth();
}

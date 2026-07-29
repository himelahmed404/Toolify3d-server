import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

function formatProfile(doc) {
  if (!doc) return null;
  return {
    userId: doc.userId,
    name: doc.name || '',
    phone: doc.phone || '',
    address: doc.address || '',
    imageUrl: doc.imageUrl || '',
    updatedAt: doc.updatedAt,
  };
}

export async function getOrCreateProfile(userId, defaults = {}) {
  const db = getDb();
  const collection = db.collection('profiles');

  let profile = await collection.findOne({ userId });
  if (profile) {
    if (!profile.phone && defaults.phone) {
      await collection.updateOne(
        { userId },
        { $set: { phone: defaults.phone, updatedAt: new Date() } }
      );
      profile = { ...profile, phone: defaults.phone };
    }
    return formatProfile(profile);
  }

  const now = new Date();
  const newProfile = {
    userId,
    name: defaults.name || '',
    phone: defaults.phone || '',
    address: '',
    imageUrl: defaults.imageUrl || '',
    updatedAt: now,
  };

  await collection.insertOne(newProfile);
  return formatProfile(newProfile);
}

export async function updateProfile(userId, updates) {
  const db = getDb();
  const collection = db.collection('profiles');

  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.phone !== undefined) allowed.phone = updates.phone;
  if (updates.address !== undefined) allowed.address = updates.address;
  if (updates.imageUrl !== undefined) allowed.imageUrl = updates.imageUrl;

  if (!Object.keys(allowed).length) {
    throw new AppError('No valid fields to update', 400, 'VALIDATION_ERROR');
  }

  allowed.updatedAt = new Date();

  await collection.updateOne(
    { userId },
    { $set: allowed },
    { upsert: true }
  );

  const profile = await collection.findOne({ userId });
  return formatProfile(profile);
}

export async function getUserDefaults(userId) {
  const db = getDb();
  const user = await db.collection('user').findOne({ id: userId });
  if (!user) return {};
  return {
    name: user.name || '',
    phone: user.phone || '',
    imageUrl: user.image || '',
  };
}

export function toObjectId(id) {
  if (ObjectId.isValid(id)) return new ObjectId(id);
  return id;
}

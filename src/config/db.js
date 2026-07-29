import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client;
let db;

export async function connectDb() {
  if (db) return db;

  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db('toolify3d');
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

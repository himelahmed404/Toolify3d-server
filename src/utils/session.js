import { env } from '../config/env.js';
import { getDb } from '../config/db.js';
import { AppError } from './AppError.js';

export async function getSessionFromRequest(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    throw new AppError('No session cookie found', 401, 'UNAUTHORIZED');
  }

  // Sessions may originate from either the storefront or the admin app, each on
  // its own Better Auth origin. Try each until one resolves a valid session.
  for (const baseUrl of env.betterAuthUrls) {
    const response = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) continue;

    const data = await response.json();
    if (data?.user) {
      return data;
    }
  }

  throw new AppError('Invalid or expired session', 401, 'UNAUTHORIZED');
}

export async function getSessionFromToken(sessionToken) {
  const db = getDb();
  const session = await db.collection('session').findOne({ token: sessionToken });

  if (!session) return null;
  if (new Date(session.expiresAt) <= new Date()) return null;

  const user = await db.collection('user').findOne({ id: session.userId });
  if (!user) return null;

  return { session, user };
}

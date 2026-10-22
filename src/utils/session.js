import { env } from '../config/env.js';
import { getDb } from '../config/db.js';
import { AppError } from './AppError.js';

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

/**
 * Better Auth stores a signed cookie: `${sessionToken}.${base64Hmac}`.
 * Mongo `session.token` is the unsigned token only.
 */
function unwrapSignedSessionCookie(value) {
  if (!value) return null;
  const signatureStartPos = value.lastIndexOf('.');
  if (signatureStartPos < 1) return value;
  const token = value.slice(0, signatureStartPos);
  const signature = value.slice(signatureStartPos + 1);
  // better-call signatures are 44-char base64 ending with '='
  if (signature.length === 44 && signature.endsWith('=')) {
    return token;
  }
  return value;
}

function getSessionTokenFromCookieHeader(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  for (const name of SESSION_COOKIE_NAMES) {
    if (cookies[name]) return unwrapSignedSessionCookie(cookies[name]);
  }
  return null;
}

function toAuthPayload(session, user) {
  return {
    session,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      role: user.role ?? 'user',
    },
  };
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

async function getSessionViaBetterAuthHttp(cookieHeader) {
  // Fallback only: server-to-server calls to Vercel can return HTML
  // (protection / redirects). Never throw on bad bodies.
  for (const baseUrl of env.betterAuthUrls) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { cookie: cookieHeader },
        redirect: 'manual',
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const data = await response.json();
      if (data?.user) {
        return data;
      }
    } catch {
      // Ignore network / parse errors and try the next origin.
    }
  }

  return null;
}

export async function getSessionFromRequest(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    throw new AppError('No session cookie found', 401, 'UNAUTHORIZED');
  }

  // Primary: resolve Better Auth session cookie directly from Mongo.
  // Reliable for Vercel (store/admin) → Render API without HTTP callbacks.
  const sessionToken = getSessionTokenFromCookieHeader(cookieHeader);
  if (sessionToken) {
    const fromDb = await getSessionFromToken(sessionToken);
    if (fromDb) {
      return toAuthPayload(fromDb.session, fromDb.user);
    }
  }

  const fromHttp = await getSessionViaBetterAuthHttp(cookieHeader);
  if (fromHttp?.user) {
    return fromHttp;
  }

  throw new AppError('Invalid or expired session', 401, 'UNAUTHORIZED');
}

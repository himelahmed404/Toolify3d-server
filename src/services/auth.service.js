import { signAccessToken } from '../utils/jwt.js';
import { getSessionFromRequest } from '../utils/session.js';
import { getFirebaseAuth } from '../config/firebase.js';

export async function exchangeToken(req) {
  const data = await getSessionFromRequest(req);
  const token = signAccessToken({
    sub: data.user.id,
    email: data.user.email,
    role: data.user.role ?? 'user',
  });

  return {
    accessToken: token,
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      image: data.user.image,
      phone: data.user.phone,
    },
  };
}

export function getCurrentUser(req) {
  return {
    id: req.user.id,
    email: req.user.email,
  };
}

export async function createFirebaseCustomToken(userId) {
  const token = await getFirebaseAuth().createCustomToken(userId);
  return { token };
}

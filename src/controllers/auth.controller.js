import * as authService from '../services/auth.service.js';

export async function exchangeToken(req, res, next) {
  try {
    const data = await authService.exchangeToken(req);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res) {
  res.json({ data: authService.getCurrentUser(req) });
}

export async function getFirebaseToken(req, res, next) {
  try {
    const data = await authService.createFirebaseCustomToken(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

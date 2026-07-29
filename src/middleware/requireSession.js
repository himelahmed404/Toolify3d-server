import { getSessionFromRequest } from '../utils/session.js';

export async function requireSession(req, _res, next) {
  try {
    const data = await getSessionFromRequest(req);
    req.authSession = data.session;
    req.authUser = data.user;
    next();
  } catch (err) {
    next(err);
  }
}

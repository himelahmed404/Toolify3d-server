import { AppError } from '../utils/AppError.js';

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }

  next();
}

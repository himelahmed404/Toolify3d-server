import { AppError } from '../utils/AppError.js';

export function validateBody(rules) {
  return (req, _res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      }

      if (rule.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }

      if (rule.type === 'array' && !Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      }

      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} must be a valid email`);
      }

      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
    }

    if (errors.length) {
      return next(new AppError(errors.join(', '), 400, 'VALIDATION_ERROR'));
    }

    return next();
  };
}

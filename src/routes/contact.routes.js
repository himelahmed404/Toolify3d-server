import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../middleware/validate.js';
import * as contactController from '../controllers/contact.controller.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many contact requests, please try again later', code: 'RATE_LIMIT' } },
});

router.post(
  '/',
  contactLimiter,
  validateBody({
    name: { required: true, type: 'string' },
    email: { required: true, type: 'email' },
    quantity: { required: true, type: 'number', min: 1 },
    material: { required: true, type: 'string' },
    description: { required: true, type: 'string' },
  }),
  contactController.submitContact
);

export default router;

import { Router } from 'express';
import { requireSession } from '../middleware/requireSession.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authTokenLimiter } from '../middleware/rateLimit.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/token', authTokenLimiter, requireSession, authController.exchangeToken);
router.get('/me', requireAuth, authController.getMe);
router.get('/firebase-token', requireAuth, authController.getFirebaseToken);

export default router;

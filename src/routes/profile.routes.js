import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import * as profileController from '../controllers/profile.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', profileController.getProfile);
router.patch(
  '/',
  validateBody({
    name: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
    imageUrl: { type: 'string' },
  }),
  profileController.updateProfile
);

export default router;

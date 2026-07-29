import { Router } from 'express';
import * as siteSettingsController from '../controllers/siteSettings.controller.js';

const router = Router();

router.get('/public', siteSettingsController.getPublicSettings);

export default router;

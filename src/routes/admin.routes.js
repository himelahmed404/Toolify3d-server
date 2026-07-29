import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminApiLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import * as adminController from '../controllers/admin.controller.js';
import * as materialsController from '../controllers/materials.controller.js';
import * as siteSettingsController from '../controllers/siteSettings.controller.js';

const router = Router();

router.use(adminApiLimiter, requireAuth, requireAdmin);

router.get('/materials', materialsController.listAdminMaterials);
router.patch('/materials/:slug', materialsController.updateMaterial);
router.get('/settings', siteSettingsController.getAdminSettings);
router.patch('/settings', siteSettingsController.updateAdminSettings);

router.get('/dashboard', adminController.getDashboard);
router.get('/customers', adminController.listCustomers);
router.get('/orders', adminController.listOrders);
router.patch(
  '/orders/:id/status',
  validateBody({
    type: { required: true, type: 'string' },
    status: { required: true, type: 'string' },
  }),
  adminController.updateOrderStatus
);

router.get('/database/firebase-stl/stats', adminController.getFirebaseStorageStats);
router.delete('/database/firebase-stl', adminController.deleteFirebaseStlFiles);
router.delete('/database/products', adminController.deleteAllProducts);
router.get('/database/export/customers', adminController.exportCustomers);

export default router;

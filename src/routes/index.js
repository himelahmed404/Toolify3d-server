import { Router } from 'express';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import productsRoutes from './products.routes.js';
import cartRoutes from './cart.routes.js';
import ordersRoutes from './orders.routes.js';
import contactRoutes from './contact.routes.js';
import adminRoutes from './admin.routes.js';
import materialsRoutes from './materials.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/products', productsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/contact', contactRoutes);
router.use('/materials', materialsRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router;

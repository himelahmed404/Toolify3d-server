import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateBody } from '../middleware/validate.js';
import * as productsController from '../controllers/products.controller.js';

const router = Router();

router.get('/', productsController.listProducts);
router.get('/:id', productsController.getProduct);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody({
    name: { required: true, type: 'string' },
    price: { required: true, type: 'number', min: 0 },
    material: { required: true, type: 'string' },
    category: { required: true, type: 'string' },
    image: { type: 'string' },
    modalImage: { type: 'string' },
    images: { type: 'array' },
    specs: { type: 'string' },
    weight: { type: 'string' },
    layerHeight: { type: 'string' },
    printTime: { type: 'string' },
    colors: { type: 'array' },
    featured: { type: 'boolean' },
    hasCustomText: { type: 'boolean' },
    available: { type: 'boolean' },
    description: { type: 'string' },
    productId: { type: 'string' },
  }),
  productsController.createProduct
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateBody({
    name: { type: 'string' },
    price: { type: 'number', min: 0 },
    material: { type: 'string' },
    category: { type: 'string' },
    specs: { type: 'string' },
    weight: { type: 'string' },
    layerHeight: { type: 'string' },
    printTime: { type: 'string' },
    image: { type: 'string' },
    modalImage: { type: 'string' },
    images: { type: 'array' },
    colors: { type: 'array' },
    featured: { type: 'boolean' },
    hasCustomText: { type: 'boolean' },
    available: { type: 'boolean' },
    description: { type: 'string' },
    productId: { type: 'string' },
  }),
  productsController.updateProduct
);

router.delete('/:id', requireAuth, requireAdmin, productsController.deleteProduct);

export default router;

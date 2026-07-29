import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import * as cartController from '../controllers/cart.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post(
  '/items',
  validateBody({
    productId: { required: true, type: 'string' },
    quantity: { type: 'number', min: 1 },
    customText: { type: 'string' },
    colorHex: { type: 'string' },
    colorLabel: { type: 'string' },
  }),
  cartController.addCartItem
);
router.patch(
  '/items/:productId',
  validateBody({
    quantity: { required: true, type: 'number', min: 1 },
    customText: { type: 'string' },
    colorHex: { type: 'string' },
  }),
  cartController.updateCartItem
);
router.delete('/items/:productId', cartController.removeCartItem);
router.post(
  '/custom-items',
  validateBody({
    fileName: { required: true, type: 'string' },
    fileUrl: { required: true, type: 'string' },
    storagePath: { required: true, type: 'string' },
    totalCost: { required: true, type: 'number' },
    material: { required: true },
    volumeCm3: { required: true, type: 'number' },
    estimatedWeight: { type: 'number' },
    pricePerGram: { type: 'number' },
    fileSize: { type: 'number' },
    fileType: { type: 'string' },
    quantity: { type: 'number', min: 1 },
  }),
  cartController.addCustomCartItem
);
router.patch(
  '/custom-items/:customItemId',
  validateBody({
    quantity: { required: true, type: 'number', min: 1 },
  }),
  cartController.updateCustomCartItem
);
router.delete('/custom-items/:customItemId', cartController.removeCustomCartItem);
router.delete('/', cartController.clearCart);

export default router;

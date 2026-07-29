import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validate.js';
import * as ordersController from '../controllers/orders.controller.js';
import * as customOrdersController from '../controllers/customOrders.controller.js';

const router = Router();

router.use(requireAuth);

// Custom (STL/OBJ) orders — file bytes live in Firebase Storage, we persist the
// download URL only. Registered before "/:id" so "custom" is not treated as an id.
router.post(
  '/custom',
  validateBody({
    fileName: { required: true, type: 'string' },
    fileUrl: { required: true, type: 'string' },
    totalCost: { type: 'number' },
  }),
  customOrdersController.createCustomOrder
);
router.get('/custom', customOrdersController.listCustomOrders);
router.get('/custom/:id', customOrdersController.getCustomOrder);

router.post(
  '/',
  validateBody({
    shippingAddress: { required: true },
    notes: { type: 'string' },
  }),
  ordersController.createOrder
);
router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);

export default router;

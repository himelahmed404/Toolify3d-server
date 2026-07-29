import { Router } from 'express';
import * as materialsController from '../controllers/materials.controller.js';

const router = Router();

router.get('/', materialsController.listPublicMaterials);

export default router;

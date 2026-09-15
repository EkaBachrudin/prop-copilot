import { Router } from 'express';
import {
  createPropertyController,
  deletePropertyController,
  getPropertiesController,
  getPropertyDetailController,
  updatePropertyController,
} from '../controllers/propertiesController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/', authenticate, getPropertiesController);
router.get('/:id', authenticate, getPropertyDetailController);
router.post('/', authenticate, createPropertyController);
router.put('/:id', authenticate, updatePropertyController);
router.delete('/:id', authenticate, deletePropertyController);

export default router;

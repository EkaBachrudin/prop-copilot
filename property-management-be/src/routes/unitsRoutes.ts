import { Router } from 'express';
import {
  createUnitController,
  deleteUnitController,
  getUnitDetailController,
  getUnitsController,
  updateUnitController,
} from '../controllers/unitsController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/blocks/:blockId/units', authenticate, getUnitsController);
router.post('/blocks/:blockId/units', authenticate, createUnitController);
router.get('/units/:id', authenticate, getUnitDetailController);
router.put('/units/:id', authenticate, updateUnitController);
router.delete('/units/:id', authenticate, deleteUnitController);

export default router;

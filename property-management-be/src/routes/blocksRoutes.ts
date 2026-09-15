import { Router } from 'express';
import {
  createBlockController,
  deleteBlockController,
  updateBlockController,
} from '../controllers/blocksController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.post('/properties/:propertyId/blocks', authenticate, createBlockController);
router.put('/blocks/:id', authenticate, updateBlockController);
router.delete('/blocks/:id', authenticate, deleteBlockController);

export default router;

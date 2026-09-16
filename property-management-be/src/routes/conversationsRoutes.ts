import { Router } from 'express';
import {
  clearConversationController,
  createConversationController,
  deleteConversationController,
  getConversationController,
  getConversationsController,
  updateConversationController,
} from '../controllers/conversationsController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/', authenticate, getConversationsController);
router.get('/:id', authenticate, getConversationController);
router.post('/create', authenticate, createConversationController);
router.post('/update', authenticate, updateConversationController);
router.post('/clear', authenticate, clearConversationController);
router.post('/delete', authenticate, deleteConversationController);

export default router;

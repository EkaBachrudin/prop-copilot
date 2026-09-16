import { Router } from 'express';
import {
  getMessagesController,
  sendMessageController,
  simulateMessageController,
} from '../controllers/messagesController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/', authenticate, getMessagesController);
router.post('/send', authenticate, sendMessageController);
router.post('/simulate', authenticate, simulateMessageController);

export default router;

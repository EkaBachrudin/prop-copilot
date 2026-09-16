import { Router } from 'express';
import {
  receiveWebhookController,
  verifyWebhookController,
} from '../controllers/webhookController';

const router = Router();

// Public Meta WhatsApp webhook (verification + message events).
router.get('/whatsapp', verifyWebhookController);
router.post('/whatsapp', receiveWebhookController);

export default router;

import { Router } from 'express';
import {
  getWhatsAppSetupController,
  getWhatsAppStatusController,
  updateWhatsAppSetupController,
} from '../controllers/settingsController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/whatsapp/status', authenticate, getWhatsAppStatusController);
router.get('/whatsapp/setup', authenticate, getWhatsAppSetupController);
router.post('/whatsapp/setup', authenticate, updateWhatsAppSetupController);

export default router;

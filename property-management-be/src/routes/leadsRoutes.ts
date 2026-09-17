import { Router } from 'express';
import { getLeadsController, toggleLeadAgentController } from '../controllers/leadsController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

// Mounted at the API root so paths match the documented API.
router.get('/leads', authenticate, getLeadsController);
router.patch('/lead/:id/toggle-agent', authenticate, toggleLeadAgentController);

export default router;

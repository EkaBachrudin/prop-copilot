import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/authController';
import { authenticate } from '../middleware/auth/authenticate';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/login  — public
router.post('/login', authLimiter, loginController);

// POST /api/v1/auth/logout — authenticated
router.post('/logout', authenticate, logoutController);

// GET  /api/v1/auth/me     — authenticated
router.get('/me', authenticate, meController);

export default router;

import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/send-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.get('/me', authenticateToken, AuthController.getMe);

export default router;

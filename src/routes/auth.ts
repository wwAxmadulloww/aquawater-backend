import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased limit to prevent proxy IP blocking
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Juda ko\'p urinishlar, iltimos 1 daqiqadan so\'ng qayta urinib ko\'ring.' },
});

router.post('/send-otp', authLimiter, authController.sendOtp);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', auth, authController.getMe);
router.patch('/language', auth, authController.updateLanguage);

export default router;

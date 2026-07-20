import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Juda ko\'p urinishlar, iltimos keyinroq qayta urinib ko\'ring.' },
});

const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1,
    message: { message: 'Iltimos, keyingi kodni olish uchun 1 daqiqa kuting.' },
});

const otpVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: { message: 'Juda ko\'p xato kod kiritildi, iltimos 5 daqiqa kuting.' },
});

router.post('/send-otp', otpSendLimiter, authController.sendOtp);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOtp);
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', auth, authController.getMe);
router.patch('/language', auth, authController.updateLanguage);

export default router;

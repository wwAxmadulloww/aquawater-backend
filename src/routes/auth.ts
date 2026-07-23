import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

// Per-IP ceiling for the whole auth surface. Deliberately loose — offices and
// mobile carriers put many real customers behind one address, and /me is hit on
// every page load. The per-phone limits below do the real work. Uses the
// library's default key generator, which normalises IPv6 to a subnet correctly.
const ipLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Juda ko\'p urinishlar, iltimos keyinroq qayta urinib ko\'ring.' },
});

/**
 * Per-phone limiter for the endpoints an attacker actually targets.
 *
 * Keyed by phone rather than IP: the previous single 500-per-15-minutes IP
 * limit allowed effectively unlimited password guesses against one account,
 * while a shared mobile-carrier NAT could lock out real customers. The IP
 * ceiling above still applies on top of this.
 */
const perPhoneLimiter = (max: number, windowMs: number, message: string) => rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.body?.phone || 'no-phone'),
    message: { message },
});

const loginLimiter = perPhoneLimiter(
    10, 15 * 60 * 1000,
    'Juda ko\'p urinishlar, iltimos 15 daqiqadan so\'ng qayta urinib ko\'ring.',
);

// SMS costs money — cap sends per phone number hard.
const otpLimiter = perPhoneLimiter(
    5, 60 * 60 * 1000,
    'SMS yuborish chegarasi oshib ketdi. 1 soatdan so\'ng urinib ko\'ring.',
);

router.use(ipLimiter);

router.post('/send-otp', otpLimiter, authController.sendOtp);
router.post('/verify-otp', loginLimiter, authController.verifyOtp);
router.post('/register', loginLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', auth, authController.getMe);
router.patch('/language', auth, authController.updateLanguage);

export default router;

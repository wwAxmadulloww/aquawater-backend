import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';
import { OtpService } from '../services/OtpService';

const router = Router();

// Rate limiters for production security
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Juda ko\'p urinishlar, iltimos keyinroq qayta urinib ko\'ring.' },
});

const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // 1 OTP per minute per IP
    message: { message: 'Iltimos, keyingi kodni olish uchun 1 daqiqa kuting.' },
    skipSuccessfulRequests: false,
});

const otpVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 attempts
    message: { message: 'Juda ko\'p xato kod kiritildi, iltimos 5 daqiqa kuting.' },
});

const phoneRegex = /^\+998\d{9}$/;

// Schemas
const sendOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri formatda (+998XXXXXXXXX)'),
});

const verifyOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    code: z.string().min(4).max(6),
});

const registerSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    name: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak').max(50),
    password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

const loginSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    password: z.string().min(1, 'Parol kiritilishi shart'),
});

// 1. SEND OTP
router.post('/send-otp', otpSendLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = sendOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone } = parsed.data;

        // Skip OTP sending for now as per user request
        /*
        const existingUser = await User.findOne({ phone });
        const result = await OtpService.sendOtp(phone);
        if (!result.success) {
            res.status(400).json({ message: result.message, cooldown: result.cooldown });
            return;
        }
        */

        res.status(200).json({ message: 'Tasdiqlash kodi yuborildi (Simulyatsiya)', phone });
    } catch (err) {
        console.error('[Auth] send-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});

// 2. VERIFY OTP
router.post('/verify-otp', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = verifyOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, code } = parsed.data;
        const result = await OtpService.verifyOtp(phone, code);

        if (!result.success) {
            res.status(400).json({ message: result.message });
            return;
        }

        // If user already exists, we can return a login token here (Login-via-OTP flow)
        const user = await User.findOne({ phone });
        if (user && user.passwordHash) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
            res.json({
                message: 'Muvaffaqiyatli kirildi',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    isPhoneVerified: true
                }
            });
            return;
        }

        res.json({ message: result.message, phone });
    } catch (err) {
        console.error('[Auth] verify-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});

// 3. COMPLETE REGISTRATION
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, name, password } = parsed.data;

        // CHECK IF VERIFIED (Commented out for now)
        /*
        const isVerified = await OtpService.isVerified(phone);
        if (!isVerified) {
            res.status(403).json({ message: 'Telefon raqami tasdiqlanmagan yoki tasdiqlash muddati tugagan' });
            return;
        }
        */

        // CHECK IF ALREADY EXISTS
        const existing = await User.findOne({ phone });
        if (existing && existing.passwordHash) {
            res.status(409).json({ message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
            return;
        }

        let user;
        const passwordHash = await bcrypt.hash(password, 12);

        if (existing) {
            // Update existing pending user
            existing.name = name;
            existing.passwordHash = passwordHash;
            existing.isPhoneVerified = true;
            user = await existing.save();
        } else {
            // Create new user
            user = await User.create({
                phone,
                name,
                passwordHash,
                isPhoneVerified: true,
                role: 'customer'
            });
        }

        // MARK OTP AS USED (Commented out)
        // await OtpService.markAsUsed(phone);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.status(201).json({
            message: 'Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi',
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        console.error('[Auth] register error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});

// LOGIN (Regular)
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, password } = parsed.data;
        const user = await User.findOne({ phone });

        if (!user || !user.passwordHash) {
            res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
            return;
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                preferredLanguage: user.preferredLanguage
            },
        });
    } catch (err) {
        console.error('[Auth] login error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});

// ME & LANGUAGE
router.get('/me', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    res.json(req.user);
});

router.patch('/language', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { language } = req.body;
        if (!['uz', 'ru', 'en'].includes(language)) {
            res.status(400).json({ message: 'Noto\'g\'ri til' });
            return;
        }
        await User.findByIdAndUpdate(req.user!._id, { preferredLanguage: language });
        res.json({ message: 'Til yangilandi' });
    } catch {
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});

export default router;

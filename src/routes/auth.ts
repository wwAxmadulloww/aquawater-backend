import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';
import { OtpService } from '../services/OtpService';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
});

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 attempts
    message: 'Too many verification attempts, please try again in 5 minutes.',
});

const resendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // 1 resend per minute
    message: 'Please wait 1 minute before requesting another code.',
});

const phoneRegex = /^\+998\d{9}$/;

const registerInitiateSchema = z.object({
    name: z.string().min(2).max(50),
    phone: z.string().regex(phoneRegex, 'Invalid Uzbek phone number format (+998XXXXXXXXX)'),
});

const loginSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone format'),
    password: z.string().min(1),
});

const verifyOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone format'),
    code: z.string().length(6),
});

const registerCompleteSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone format'),
    password: z.string().min(6),
});

const resendOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone format'),
});

// POST /api/auth/register/initiate
router.post('/register/initiate', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = registerInitiateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { name, phone } = parsed.data;
        const existing = await User.findOne({ phone });

        if (existing && existing.passwordHash) {
            res.status(409).json({ message: 'Phone number already registered' });
            return;
        }

        const otp = OtpService.generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (existing) {
            // Update existing pending user
            existing.name = name;
            existing.otp = otp;
            existing.otpExpires = otpExpires;
            existing.isPhoneVerified = false;
            await existing.save();
        } else {
            // Create new pending user
            await User.create({
                name,
                phone,
                otp,
                otpExpires,
                isPhoneVerified: false
            });
        }

        await OtpService.sendOtp(phone, otp);

        res.status(200).json({
            message: 'OTP sent. Please verify your phone number.',
            phone
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/auth/register/complete
router.post('/register/complete', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = registerCompleteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, password } = parsed.data;
        const user = await User.findOne({ phone });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (!user.isPhoneVerified) {
            res.status(403).json({ message: 'Phone number not verified' });
            return;
        }

        if (user.passwordHash) {
            res.status(400).json({ message: 'Registration already complete' });
            return;
        }

        user.passwordHash = await bcrypt.hash(password, 12);
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.status(201).json({
            message: 'Registration complete',
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isPhoneVerified: user.isPhoneVerified
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = verifyOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, code } = parsed.data;
        const isValid = await OtpService.verifyOtp(phone, code);

        if (!isValid) {
            res.status(400).json({ message: 'Invalid or expired OTP code' });
            return;
        }

        const user = await User.findOneAndUpdate(
            { phone },
            {
                isPhoneVerified: true,
                $unset: { otp: 1, otpExpires: 1 }
            },
            { new: true }
        );

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.passwordHash) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
            res.json({
                message: 'Phone verified successfully',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    isPhoneVerified: user.isPhoneVerified,
                    preferredLanguage: user.preferredLanguage,
                    workerType: user.workerType
                }
            });
        } else {
            res.json({
                message: 'Phone verified successfully',
                phone: user.phone
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', resendLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = resendOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone } = parsed.data;
        const user = await User.findOne({ phone });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isPhoneVerified) {
            res.status(400).json({ message: 'Phone already verified' });
            return;
        }

        const otp = OtpService.generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpires = otpExpires;
        user.lastOtpResend = new Date();
        await user.save();

        await OtpService.sendOtp(phone, otp);

        res.json({ message: 'OTP code resent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, password } = parsed.data;
        const user = await User.findOne({ phone });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        if (!user.isPhoneVerified) {
            res.status(403).json({
                message: 'Phone number not verified',
                requiresVerification: true,
                phone: user.phone
            });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
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
                isPhoneVerified: user.isPhoneVerified,
                preferredLanguage: user.preferredLanguage,
                workerType: user.workerType
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/auth/me
router.get('/me', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    res.json(req.user);
});

// PATCH /api/auth/language
router.patch('/language', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { language } = req.body;
        if (!['uz', 'ru', 'en'].includes(language)) {
            res.status(400).json({ message: 'Invalid language' });
            return;
        }
        await User.findByIdAndUpdate(req.user!._id, { preferredLanguage: language });
        res.json({ message: 'Language updated' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

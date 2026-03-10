import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import User from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased for stability
    message: 'Too many requests, please try again later.',
});

const phoneRegex = /^\+998\d{9}$/;

const registerSchema = z.object({
    name: z.string().min(2).max(50),
    phone: z.string().regex(phoneRegex, 'Invalid Uzbek phone number format (+998XXXXXXXXX)'),
    password: z.string().min(6),
});

const loginSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone format'),
    password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { name, phone, password } = parsed.data;
        const existing = await User.findOne({ phone });
        if (existing) {
            res.status(409).json({ message: 'Phone number already registered' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ name, phone, passwordHash });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, phone: user.phone, role: user.role, workerType: user.workerType },
        });
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

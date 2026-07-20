import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { OtpService } from '../services/OtpService';

const phoneRegex = /^\+998\d{9}$/;

export const sendOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri formatda (+998XXXXXXXXX)'),
});

export const verifyOtpSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    code: z.string().min(4).max(6),
});

export const registerSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    name: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak').max(50),
    password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

export const loginSchema = z.object({
    phone: z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    password: z.string().min(1, 'Parol kiritilishi shart'),
});

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = sendOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone } = parsed.data;
        res.status(200).json({ message: 'Tasdiqlash kodi yuborildi (Simulyatsiya)', phone });
    } catch (err) {
        console.error('[Auth] send-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
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

        const user = await User.findOne({ phone });
        if (user && user.passwordHash) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
            res.json({
                message: 'Muvaffaqiyatli kirildi',
                token,
                user: {
                    _id: user._id,
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    isPhoneVerified: user.isPhoneVerified ?? true
                }
            });
            return;
        }

        res.json({ message: result.message, phone });
    } catch (err) {
        console.error('[Auth] verify-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { phone, name, password } = parsed.data;

        const existing = await User.findOne({ phone });
        if (existing && existing.passwordHash) {
            res.status(409).json({ message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
            return;
        }

        let user;
        const passwordHash = await bcrypt.hash(password, 12);

        if (existing) {
            existing.name = name;
            existing.passwordHash = passwordHash;
            existing.isPhoneVerified = true;
            user = await existing.save();
        } else {
            user = await User.create({
                phone,
                name,
                passwordHash,
                isPhoneVerified: true,
                role: 'customer'
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.status(201).json({
            message: 'Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi',
            token,
            user: {
                _id: user._id,
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isPhoneVerified: true
            }
        });
    } catch (err) {
        console.error('[Auth] register error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
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
                _id: user._id,
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isPhoneVerified: user.isPhoneVerified ?? true,
                preferredLanguage: user.preferredLanguage
            },
        });
    } catch (err) {
        console.error('[Auth] login error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    res.json(req.user);
};

export const updateLanguage = async (req: AuthRequest, res: Response): Promise<void> => {
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
};

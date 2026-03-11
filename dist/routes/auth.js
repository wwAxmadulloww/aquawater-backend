"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const OtpService_1 = require("../services/OtpService");
const router = (0, express_1.Router)();
// Rate limiters for production security
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Juda ko\'p urinishlar, iltimos keyinroq qayta urinib ko\'ring.' },
});
const otpSendLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // 1 OTP per minute per IP
    message: { message: 'Iltimos, keyingi kodni olish uchun 1 daqiqa kuting.' },
    skipSuccessfulRequests: false,
});
const otpVerifyLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 attempts
    message: { message: 'Juda ko\'p xato kod kiritildi, iltimos 5 daqiqa kuting.' },
});
const phoneRegex = /^\+998\d{9}$/;
// Schemas
const sendOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri formatda (+998XXXXXXXXX)'),
});
const verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    code: zod_1.z.string().min(4).max(6),
});
const registerSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    name: zod_1.z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak').max(50),
    password: zod_1.z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});
const loginSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, 'Telefon raqami noto\'g\'ri'),
    password: zod_1.z.string().min(1, 'Parol kiritilishi shart'),
});
// 1. SEND OTP
router.post('/send-otp', otpSendLimiter, async (req, res) => {
    try {
        const parsed = sendOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const { phone } = parsed.data;
        // Optional: Check if user already exists and has a password
        const existingUser = await User_1.default.findOne({ phone });
        if (existingUser && existingUser.passwordHash) {
            // If user exists, this might be a login OTP or just a conflict
            // The user requested this flow for registration. 
            // We'll allow sending OTP but registration will fail if user exists.
        }
        const result = await OtpService_1.OtpService.sendOtp(phone);
        if (!result.success) {
            res.status(400).json({ message: result.message, cooldown: result.cooldown });
            return;
        }
        res.status(200).json({ message: result.message, phone });
    }
    catch (err) {
        console.error('[Auth] send-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});
// 2. VERIFY OTP
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
    try {
        const parsed = verifyOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const { phone, code } = parsed.data;
        const result = await OtpService_1.OtpService.verifyOtp(phone, code);
        if (!result.success) {
            res.status(400).json({ message: result.message });
            return;
        }
        // If user already exists, we can return a login token here (Login-via-OTP flow)
        const user = await User_1.default.findOne({ phone });
        if (user && user.passwordHash) {
            const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
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
    }
    catch (err) {
        console.error('[Auth] verify-otp error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});
// 3. COMPLETE REGISTRATION
router.post('/register', authLimiter, async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const { phone, name, password } = parsed.data;
        // CHECK IF VERIFIED
        const isVerified = await OtpService_1.OtpService.isVerified(phone);
        if (!isVerified) {
            res.status(403).json({ message: 'Telefon raqami tasdiqlanmagan' });
            return;
        }
        // CHECK IF ALREADY EXISTS
        const existing = await User_1.default.findOne({ phone });
        if (existing && existing.passwordHash) {
            res.status(409).json({ message: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
            return;
        }
        let user;
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        if (existing) {
            // Update existing pending user (one created without password maybe)
            existing.name = name;
            existing.passwordHash = passwordHash;
            existing.isPhoneVerified = true;
            user = await existing.save();
        }
        else {
            // Create new user
            user = await User_1.default.create({
                phone,
                name,
                passwordHash,
                isPhoneVerified: true,
                role: 'customer'
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
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
    }
    catch (err) {
        console.error('[Auth] register error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});
// LOGIN (Regular)
router.post('/login', authLimiter, async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const { phone, password } = parsed.data;
        const user = await User_1.default.findOne({ phone });
        if (!user || !user.passwordHash) {
            res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
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
    }
    catch (err) {
        console.error('[Auth] login error:', err);
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});
// ME & LANGUAGE
router.get('/me', auth_1.auth, async (req, res) => {
    res.json(req.user);
});
router.patch('/language', auth_1.auth, async (req, res) => {
    try {
        const { language } = req.body;
        if (!['uz', 'ru', 'en'].includes(language)) {
            res.status(400).json({ message: 'Noto\'g\'ri til' });
            return;
        }
        await User_1.default.findByIdAndUpdate(req.user._id, { preferredLanguage: language });
        res.json({ message: 'Til yangilandi' });
    }
    catch {
        res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
    }
});
exports.default = router;

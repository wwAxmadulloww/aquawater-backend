"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const PhoneVerification_1 = __importDefault(require("../models/PhoneVerification"));
const EskizService_1 = require("./EskizService");
class OtpService {
    /**
     * Generates a 6-digit OTP code
     */
    static generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    /**
     * Generates and sends an OTP to the given phone number
     */
    static async sendOtp(phone) {
        const now = new Date();
        const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '5');
        const resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN || '60');
        // Check for existing verification to enforce resend cooldown
        const existing = await PhoneVerification_1.default.findOne({ phone }).sort({ createdAt: -1 });
        if (existing && existing.lastResendAt) {
            const diffInSeconds = Math.floor((now.getTime() - existing.lastResendAt.getTime()) / 1000);
            if (diffInSeconds < resendCooldown) {
                return {
                    success: false,
                    message: `Iltimos, ${resendCooldown - diffInSeconds} soniyadan keyin qayta urinib ko'ring.`,
                    cooldown: resendCooldown - diffInSeconds
                };
            }
        }
        const code = this.generateCode();
        const expiresAt = new Date(now.getTime() + expireMinutes * 60 * 1000);
        // For security, Eskiz credentials might be missing in dev
        const isMock = !process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD;
        const msg = `AquaWater: Tasdiqlash kodi: ${code}. Uni hech kimga bermang.`;
        try {
            const sent = await EskizService_1.EskizService.sendSms(phone, msg);
            if (!sent && !isMock) {
                return { success: false, message: "SMS yuborishda xatolik yuz berdi." };
            }
            // Update or create verification record
            await PhoneVerification_1.default.findOneAndUpdate({ phone }, {
                phone,
                code,
                expiresAt,
                verified: false,
                attempts: 0,
                lastResendAt: now
            }, { upsert: true, new: true });
            console.log(`[OTP] Sent to ${phone}: ${code} (Mock: ${isMock})`);
            return { success: true, message: "Tasdiqlash kodi yuborildi." };
        }
        catch (error) {
            console.error('[OtpService] Error sending OTP:', error);
            return { success: false, message: "Serverda xatolik yuz berdi." };
        }
    }
    /**
     * Validates if the OTP is correct and not expired
     */
    static async verifyOtp(phone, code) {
        const verification = await PhoneVerification_1.default.findOne({ phone }).sort({ createdAt: -1 });
        if (!verification) {
            return { success: false, message: "Tasdiqlash kodi topilmadi." };
        }
        if (verification.verified) {
            return { success: true, message: "Telefon raqami allaqachon tasdiqlangan." };
        }
        if (new Date() > verification.expiresAt) {
            return { success: false, message: "Tasdiqlash kodining amal qilish muddati tugagan." };
        }
        if (verification.attempts >= 5) {
            return { success: false, message: "Urinishlar soni oshib ketdi. Yangi kod so'rang." };
        }
        // Universal development code
        const isDev = process.env.NODE_ENV === 'development';
        const isMatch = verification.code === code || (isDev && code === '123456');
        if (!isMatch) {
            verification.attempts += 1;
            await verification.save();
            return { success: false, message: "Tasdiqlash kodi noto'g'ri." };
        }
        verification.verified = true;
        verification.attempts = 0;
        await verification.save();
        return { success: true, message: "Telefon raqami muvaffaqiyatli tasdiqlandi." };
    }
    /**
     * Checks if a phone number is verified and ready for registration
     */
    static async isVerified(phone) {
        const verification = await PhoneVerification_1.default.findOne({ phone, verified: true });
        return !!verification;
    }
}
exports.OtpService = OtpService;

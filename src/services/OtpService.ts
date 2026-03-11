import bcrypt from 'bcryptjs';
import PhoneVerification from '../models/PhoneVerification';
import { EskizService } from './EskizService';

export class OtpService {
    /**
     * Generates a random OTP code based on OTP_LENGTH env variable
     */
    private static generateCode(): string {
        const length = parseInt(process.env.OTP_LENGTH || '6', 10);
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        const code = Math.floor(Math.random() * (max - min + 1)) + min;
        return code.toString();
    }

    /**
     * Generates and sends an OTP to the given phone number
     */
    public static async sendOtp(phone: string): Promise<{ success: boolean; message: string; cooldown?: number }> {
        const now = new Date();
        const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '5');
        const resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN || '60');

        // Check for existing verification to enforce resend cooldown
        const existing = await PhoneVerification.findOne({ phone }).sort({ createdAt: -1 });

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
        const hashedCode = await bcrypt.hash(code, 10);
        const expiresAt = new Date(now.getTime() + expireMinutes * 60 * 1000);

        // For security, Eskiz credentials might be missing in dev
        const isMock = !process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD;
        const msg = `AquaWater: Tasdiqlash kodi: ${code}. Uni hech kimga bermang.`;

        try {
            const sent = await EskizService.sendSms(phone, msg);
            if (!sent && !isMock) {
                return { success: false, message: "SMS yuborishda xatolik yuz berdi." };
            }

            // Update or create verification record
            await PhoneVerification.findOneAndUpdate(
                { phone },
                {
                    phone,
                    code: hashedCode,
                    expiresAt,
                    verified: false,
                    used: false,
                    attempts: 0,
                    lastResendAt: now
                },
                { upsert: true, new: true }
            );

            console.log(`[OTP] Sent to ${phone}: ${code} (Mock: ${isMock})`);
            return { success: true, message: "Tasdiqlash kodi yuborildi." };
        } catch (error) {
            console.error('[OtpService] Error sending OTP:', error);
            return { success: false, message: "Serverda xatolik yuz berdi." };
        }
    }

    /**
     * Validates if the OTP is correct and not expired
     */
    public static async verifyOtp(phone: string, code: string): Promise<{ success: boolean; message: string }> {
        const verification = await PhoneVerification.findOne({ phone }).sort({ createdAt: -1 });

        if (!verification) {
            return { success: false, message: "Tasdiqlash kodi topilmadi." };
        }

        if (verification.verified && !verification.used) {
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
        const isMatch = await bcrypt.compare(code, verification.code) || (isDev && code === '123456');

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
    public static async isVerified(phone: string): Promise<boolean> {
        const verification = await PhoneVerification.findOne({ phone, verified: true, used: false });
        if (!verification) return false;

        // Ensure it's not expired (24h safety margin for registration)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return verification.updatedAt > dayAgo;
    }

    /**
     * Marks the verification as used after registration
     */
    public static async markAsUsed(phone: string): Promise<void> {
        await PhoneVerification.findOneAndUpdate({ phone, verified: true }, { used: true });
    }
}

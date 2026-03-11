import User from '../models/User';

export class OtpService {
    /**
     * Generates a 6-digit OTP code
     */
    static generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Mocks sending an OTP code. 
     * In production, this would integrate with an SMS provider like Eskiz.
     */
    static async sendOtp(phone: string, otp: string): Promise<void> {
        console.log(`[SMS] Sending OTP ${otp} to ${phone}`);

        // This is a placeholder for actual SMS integration logic
        // Example:
        // await axios.post('https://notify.eskiz.uz/api/message/sms/send', { ... })

        // For development/mock purposes, we also store it in a field that can be checked by frontend if needed
        await User.findOneAndUpdate({ phone }, { otpMock: otp });
    }

    /**
     * Validates if the OTP is correct and not expired
     */
    static async verifyOtp(phone: string, code: string): Promise<boolean> {
        // Universal demo code for easier testing during development
        if (code === '123456') {
            return true;
        }

        const user = await User.findOne({ phone });
        if (!user || user.otp !== code || !user.otpExpires) {
            return false;
        }

        if (new Date() > user.otpExpires) {
            return false;
        }

        return true;
    }
}

import axios from 'axios';

export class EskizService {
    private static API_URL = 'https://notify.eskiz.uz/api';
    private static token: string | null = null;
    private static tokenExpiry: number | null = null;

    /**
     * Authenticates with Eskiz and returns a JWT token
     */
    private static async login(): Promise<string> {
        const email = process.env.ESKIZ_EMAIL;
        const password = process.env.ESKIZ_PASSWORD;

        if (!email || !password) {
            console.warn('[Eskiz] Credentials missing. SMS will be mocked.');
            return 'mock-token';
        }

        try {
            const response = await axios.post(`${this.API_URL}/auth/login`, {
                email,
                password
            });

            if (response.data && response.data.data && response.data.data.token) {
                this.token = response.data.data.token;
                // Tokens usually last 30 days, but we'll refresh if it's not set
                this.tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours safety
                return this.token!;
            }
            throw new Error('Invalid response from Eskiz login');
        } catch (error: any) {
            console.error('[Eskiz] Login failed:', error.response?.data || error.message);
            throw new Error('Eskiz authentication failed');
        }
    }

    /**
     * Gets a valid token, either from cache or by logging in
     */
    private static async getToken(): Promise<string> {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }
        return await this.login();
    }

    /**
     * Sends an SMS message to a phone number
     */
    public static async sendSms(phone: string, message: string): Promise<boolean> {
        // Format phone: remove + if present, Eskiz expects 998XXXXXXXXX
        const formattedPhone = phone.replace('+', '');

        if (!process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD) {
            console.log(`[SMS MOCK] To: ${phone}, Msg: ${message}`);
            return true;
        }

        try {
            const token = await this.getToken();

            if (token === 'mock-token') return true;

            const response = await axios.post(
                `${this.API_URL}/message/sms/send`,
                {
                    mobile_phone: formattedPhone,
                    message,
                    from: process.env.ESKIZ_FROM || '4545'
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data && response.data.status === 'waiting') {
                console.log(`[Eskiz] SMS sent successfully to ${phone}`);
                return true;
            }

            console.error('[Eskiz] Failed to send SMS:', response.data);
            return false;
        } catch (error: any) {
            // If token expired, clear it and retry once
            if (error.response?.status === 401) {
                this.token = null;
                return await this.sendSms(phone, message);
            }

            console.error('[Eskiz] Error sending SMS:', error.response?.data || error.message);
            return false;
        }
    }
}

import { Router, Request, Response } from 'express';
import { TelegramBotService } from '../services/TelegramBotService';

const router = Router();

/**
 * Telegram webhook receiver.
 *
 * Used instead of long-polling on serverless platforms (Vercel), where no
 * process stays alive between requests. Register it once with:
 *
 *   curl -F "url=https://<host>/api/telegram/webhook" \
 *        -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
 *        https://api.telegram.org/bot<TOKEN>/setWebhook
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    // Without a secret anyone who guesses the URL can inject fake updates.
    if (expectedSecret && req.headers['x-telegram-bot-api-secret-token'] !== expectedSecret) {
        res.status(401).json({ message: 'Invalid secret token' });
        return;
    }

    // Always ack immediately — Telegram retries on non-2xx and will otherwise
    // pile up duplicate updates while we talk to MongoDB.
    res.sendStatus(200);

    try {
        await TelegramBotService.handleUpdate(req.body);
    } catch (err: any) {
        console.error('[Telegram webhook] Handler error:', err?.message || err);
    }
});

export default router;

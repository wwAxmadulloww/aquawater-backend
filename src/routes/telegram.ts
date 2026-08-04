import { Router, Request, Response } from 'express';
import { TelegramBotService } from '../services/TelegramBotService';
import { waitForDb } from '../config/db';
import { auth, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/role';

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

    /*
     * The update must be handled BEFORE the response is sent.
     *
     * This previously acked with 200 first and awaited afterwards, on the
     * assumption that a fast ack keeps Telegram from retrying. On a serverless
     * host that assumption is wrong: the moment the response is flushed the
     * container may be frozen, so the work either never ran or resumed minutes
     * later when an unrelated request happened to thaw the same instance —
     * which is exactly how it behaved, replies arriving late or not at all,
     * with `sendMessage ... timeout of 15000ms exceeded` surfacing in the logs
     * of some other endpoint's request.
     *
     * Telegram allows up to 60s for a webhook response, and handling an update
     * takes a couple of seconds, so awaiting first is well within budget.
     */
    try {
        // A cold start is still connecting to Atlas; without this the handlers
        // see no database and answer "temporarily unavailable" on the first
        // message after an idle period.
        await waitForDb(6000);
        await TelegramBotService.handleUpdate(req.body);
    } catch (err: any) {
        console.error('[Telegram webhook] Handler error:', err?.message || err);
    }

    // Always 200, even after a failure: a non-2xx makes Telegram redeliver the
    // same update on a schedule, which turns one broken message into a loop.
    res.sendStatus(200);
});

/**
 * Pushes the bot's commands, Mini App button and profile text to Telegram.
 *
 * `syncConfiguration` existed but nothing ever called it, so none of this was
 * being applied: the description a stranger reads before pressing start was
 * whatever had last been typed into BotFather — which turned out to be an
 * advertisement somebody else had put there using a leaked token.
 *
 * Deliberately on demand rather than at startup. This host starts a fresh
 * container for almost every request, and re-pushing the same settings on each
 * one would be thousands of pointless calls into a rate-limited API.
 */
router.post('/sync', auth, adminOnly, async (_req: AuthRequest, res: Response): Promise<void> => {
    await TelegramBotService.syncConfiguration();
    // Read back, so the answer is what Telegram is serving rather than what we
    // asked it to serve.
    res.json({
        message: 'Bot sozlamalari yangilandi',
        live: await TelegramBotService.readProfileText(),
    });
});

export default router;

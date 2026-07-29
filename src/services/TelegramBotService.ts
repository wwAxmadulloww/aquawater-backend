import { TelegramClient, escapeHtml } from '../telegram/TelegramClient';
import { BotHandlers } from '../telegram/handlers';
import { orderActionKeyboard } from '../telegram/keyboards';
import { statusLabel } from '../telegram/texts';

const POLL_TIMEOUT_SEC = 25;

/*
 * Every command here must have a branch in the handler. The bot previously
 * advertised /catalog and /orders in this menu with nothing routing them, so
 * tapping either produced "unknown command" — the worst kind of dead control,
 * because the bot itself suggested it.
 */
const BOT_COMMANDS = [
    { command: 'start', description: 'Botni ishga tushirish / Запустить / Start' },
    { command: 'catalog', description: 'Mahsulotlar / Товары / Products' },
    { command: 'cart', description: 'Savat / Корзина / Cart' },
    { command: 'orders', description: 'Buyurtmalarim / Мои заказы / My orders' },
    { command: 'menu', description: 'Asosiy menyu / Главное меню / Main menu' },
    { command: 'lang', description: 'Tilni o\'zgartirish / Сменить язык / Change language' },
    { command: 'help', description: 'Aloqa / Контакты / Contact' },
];

/**
 * Owns the bot's lifecycle and the outbound notifications the rest of the app
 * sends. Message handling itself lives in `telegram/handlers.ts`.
 *
 * Static because the app has a single bot; the internals are lazily built so
 * importing this module never requires the bot to be configured.
 */
export class TelegramBotService {
    private static client: TelegramClient | null = null;
    private static handlers: BotHandlers | null = null;

    private static configured = false;
    private static polling = false;
    private static stopRequested = false;
    private static offset = 0;

    /**
     * Runs the one-off bot configuration, at most once per process.
     *
     * Failures are logged and swallowed: a bot that cannot update its own menu
     * must still answer the customer who just messaged it.
     */
    private static async ensureConfigured(): Promise<void> {
        if (this.configured) return;
        this.configured = true;

        try {
            await this.getClient()?.setMyCommands(BOT_COMMANDS);
            await this.syncMenuButton();
        } catch (err) {
            console.error('[Telegram] Configuration sync failed:', (err as Error).message);
        }
    }

    /**
     * Points the composer's Mini App button at the current deployment.
     *
     * Set once through BotFather it silently rots: this button still opened a
     * retired Vercel deployment months after the site moved, showing customers
     * an old design against a database that no longer backed it. Setting it on
     * boot from WEBAPP_URL means the button can never disagree with the site
     * the bot is actually talking to.
     */
    public static async syncMenuButton(): Promise<void> {
        const url = process.env.WEBAPP_URL;
        if (!url || !/^https:\/\//.test(url)) {
            console.warn('[Telegram] WEBAPP_URL is not an https URL; menu button left unchanged.');
            return;
        }

        try {
            await this.getClient()?.call('setChatMenuButton', {
                menu_button: {
                    type: 'web_app',
                    text: '💧 Buyurtma berish',
                    web_app: { url },
                },
            });
            console.log(`[Telegram] Mini App button -> ${url}`);
        } catch (err) {
            console.error('[Telegram] Failed to set the menu button:', (err as Error).message);
        }
    }

    // ── Configuration ────────────────────────────────────────────────────

    private static get token(): string | null {
        return process.env.TELEGRAM_BOT_TOKEN || null;
    }

    private static get adminChatId(): string | null {
        return process.env.TELEGRAM_ADMIN_CHAT_ID || null;
    }

    private static get siteUrl(): string {
        return (process.env.WEBAPP_URL || 'https://aquawater-uz.vercel.app').replace(/\/$/, '');
    }

    public static isConfigured(): boolean {
        return Boolean(this.token);
    }

    private static getClient(): TelegramClient | null {
        if (!this.token) return null;
        if (!this.client) this.client = new TelegramClient(this.token);
        return this.client;
    }

    private static getHandlers(): BotHandlers | null {
        const client = this.getClient();
        if (!client) return null;

        if (!this.handlers) {
            this.handlers = new BotHandlers({
                client,
                siteUrl: this.siteUrl,
                adminChatId: this.adminChatId,
            });
        }
        return this.handlers;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    /**
     * Starts long-polling. Safe to call twice — the second call is ignored.
     * Use webhook mode instead on platforms without a long-lived process.
     */
    public static async startPolling(): Promise<void> {
        if (this.polling) return;

        const client = this.getClient();
        if (!client) {
            console.warn('⚠️  [Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled.');
            return;
        }

        this.polling = true;
        this.stopRequested = false;

        try {
            const me = await client.getMe();
            console.log(`🤖 [Telegram] Connected as @${me.username}`);

            // Polling and webhooks are mutually exclusive; clear any webhook a
            // previous serverless deploy registered, or getUpdates returns 409.
            const hook = await client.getWebhookInfo();
            if (hook.url) {
                await client.deleteWebhook();
                console.log(`🤖 [Telegram] Removed stale webhook (${hook.url})`);
            }

            await client.setMyCommands(BOT_COMMANDS);
            await this.syncMenuButton();

            if (!this.adminChatId) {
                console.warn('⚠️  [Telegram] TELEGRAM_ADMIN_CHAT_ID not set — order notifications disabled.');
            }
        } catch (err) {
            console.error('❌ [Telegram] Startup failed:', (err as Error).message);
            this.polling = false;
            return;
        }

        // Skip whatever queued up while the server was down: replaying a day of
        // old /start messages is noise, and stale button presses are misleading.
        if (process.env.TELEGRAM_SKIP_BACKLOG !== 'false') {
            try {
                const pending = await client.getUpdates(-1, 0);
                if (pending.length > 0) {
                    this.offset = pending[pending.length - 1].update_id + 1;
                    console.log(`🤖 [Telegram] Skipped backlog through update ${this.offset - 1}`);
                }
            } catch (err) {
                console.warn('[Telegram] Backlog skip failed:', (err as Error).message);
            }
        }

        console.log('🤖 [Telegram] Polling started.');
        void this.pollLoop();
    }

    public static stopPolling(): void {
        this.stopRequested = true;
        this.polling = false;
    }

    private static async pollLoop(): Promise<void> {
        const client = this.getClient();
        if (!client) return;

        while (!this.stopRequested) {
            try {
                const updates = await client.getUpdates(this.offset, POLL_TIMEOUT_SEC);

                for (const update of updates) {
                    // Advance the offset before handling: a message that always
                    // throws would otherwise be retried forever, blocking the queue.
                    this.offset = update.update_id + 1;
                    await this.handleUpdate(update);
                }
            } catch (err: any) {
                if (this.stopRequested) break;

                // 409 means another process is polling the same token, e.g. a
                // local dev server left running. Backing off hard avoids a
                // request storm between the two.
                if (err?.code === 409) {
                    console.error('❌ [Telegram] Conflict: another instance is polling this token. Retrying in 30s.');
                    await sleep(30000);
                    continue;
                }

                if (err?.code === 401) {
                    console.error('❌ [Telegram] Unauthorized: TELEGRAM_BOT_TOKEN is invalid. Polling stopped.');
                    this.polling = false;
                    return;
                }

                console.error('[Telegram] Poll error:', err?.message || err);
                await sleep(3000);
            }
        }

        this.polling = false;
        console.log('🤖 [Telegram] Polling stopped.');
    }

    /**
     * Handles one update. Entry point for both polling and the webhook route.
     * Never throws: a single malformed update must not stop the loop.
     */
    public static async handleUpdate(update: any): Promise<void> {
        const handlers = this.getHandlers();
        if (!handlers) return;

        // Webhook mode never runs startPolling, so the command list and the
        // Mini App button would only ever be configured on a machine that
        // long-polls — which in production is none of them. Doing it here, once
        // per cold start, keeps both in step with whatever is deployed.
        await this.ensureConfigured();

        try {
            await handlers.handleUpdate(update);
        } catch (err) {
            console.error('[Telegram] Update handler error:', (err as Error).message);
        }
    }

    // ── Outbound notifications ───────────────────────────────────────────

    /** Sends a plain message to the admin group. */
    public static async sendMessage(text: string, chatId?: string, replyMarkup?: unknown): Promise<boolean> {
        const client = this.getClient();
        const target = chatId || this.adminChatId;

        if (!client || !target) {
            console.warn('[Telegram] Not configured — message skipped.');
            return false;
        }

        const messageId = await client.sendMessage(target, text, replyMarkup);
        return messageId !== null;
    }

    /**
     * Posts a new-order card with operator action buttons to the admin group.
     */
    public static async sendOrderNotification(order: any, userPhone: string, userName: string): Promise<boolean> {
        const client = this.getClient();
        if (!client || !this.adminChatId) {
            console.warn('[Telegram] Order notification skipped — bot or admin chat not configured.');
            return false;
        }

        const orderId = String(order._id ?? order.id ?? '');
        const shortId = orderId.slice(-6).toUpperCase() || '—';

        const items: any[] = Array.isArray(order.items) ? order.items : [];
        const itemLines = items.length > 0
            ? items.map((i) => {
                const line = (i.priceSnapshot || 0) * (i.qty || 0);
                return `• <b>${escapeHtml(i.nameSnapshot || 'Mahsulot')}</b> × ${i.qty} — ${fmt(line)}`;
            }).join('\n')
            : '• —';

        const total = items.reduce((sum, i) => sum + (i.priceSnapshot || 0) * (i.qty || 0), 0);

        const a = order.addressSnapshot || {};
        const address = [
            a.region, a.city, a.district,
            a.street ? `${a.street} ko'chasi` : '',
            a.house ? `${a.house}-uy` : '',
            a.apartment ? `${a.apartment}-xonadon` : '',
        ].filter(Boolean).map(escapeHtml).join(', ');

        const payment = order.paymentMethod === 'click' ? '💳 Click'
            : order.paymentMethod === 'payme' ? '💳 Payme'
            : '💵 Naqd';

        const text = [
            `🔔 <b>YANGI BUYURTMA #${escapeHtml(shortId)}</b>`,
            '',
            `👤 <b>Mijoz:</b> ${escapeHtml(userName || '—')}`,
            `📞 <b>Telefon:</b> <code>${escapeHtml(userPhone || '—')}</code>`,
            '',
            '📦 <b>Tarkibi:</b>',
            itemLines,
            '',
            `💰 <b>Jami:</b> ${fmt(total)}`,
            `💳 <b>To'lov:</b> ${payment}`,
            '',
            `📍 <b>Manzil:</b> ${address || '—'}`,
            `📅 <b>Yetkazish:</b> ${escapeHtml(order.deliveryDate || '—')} ${escapeHtml(order.deliveryTimeSlot || '')}`,
            '',
            `📌 <b>Holat:</b> ${statusLabel(order.status || 'pending')}`,
        ].join('\n');

        const messageId = await client.sendMessage(
            this.adminChatId,
            text,
            orderActionKeyboard(orderId, order.status || 'pending'),
        );

        return messageId !== null;
    }

    /**
     * Announces a status change made from the web dashboard, so the Telegram
     * group and the dashboard never drift apart. Also notifies the customer.
     */
    public static async sendStatusUpdateNotification(order: any, changedBy: string): Promise<boolean> {
        const orderId = String(order._id ?? order.id ?? '');
        const shortId = orderId.slice(-6).toUpperCase() || '—';

        const ok = await this.sendMessage([
            `🔄 <b>BUYURTMA YANGILANDI #${escapeHtml(shortId)}</b>`,
            '',
            `📌 <b>Yangi holat:</b> ${statusLabel(order.status)}`,
            `👤 <b>O'zgartirdi:</b> ${escapeHtml(changedBy)} (sayt orqali)`,
        ].join('\n'));

        const handlers = this.getHandlers();
        if (handlers) await handlers.notifyCustomer(order);

        return ok;
    }
}

const fmt = (value: number): string => `<b>${Math.round(value).toLocaleString('ru-RU')}</b> so'm`;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

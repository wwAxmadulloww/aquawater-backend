import mongoose from 'mongoose';
import BotUser, { IBotUser } from '../models/BotUser';
import User from '../models/User';
import Product from '../models/Product';
import Branch from '../models/Branch';
import Order from '../models/Order';
import { TelegramClient, escapeHtml } from './TelegramClient';
import { BotLang, normalizeLang, t, statusLabel } from './texts';
import {
    mainKeyboard,
    requestPhoneKeyboard,
    languageKeyboard,
    siteLinksKeyboard,
    orderCtaKeyboard,
    orderActionKeyboard,
} from './keyboards';

const MAX_ORDERS_SHOWN = 5;
const MAX_PRODUCTS_SHOWN = 12;
const MAX_BRANCHES_SHOWN = 8;

/** Statuses an operator may set from the Telegram group. */
const OPERATOR_STATUSES = ['confirmed', 'in_transit', 'delivered', 'cancelled'] as const;

export interface HandlerDeps {
    client: TelegramClient;
    siteUrl: string;
    adminChatId: string | null;
}

const dbReady = (): boolean => mongoose.connection.readyState === 1;

const formatPrice = (value: number): string => `${Math.round(value).toLocaleString('ru-RU')} so'm`;

/**
 * Telegram reports numbers without a leading `+` and sometimes with
 * separators; the app stores them as `+998XXXXXXXXX`.
 */
export function normalizePhone(raw: string): string | null {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return null;
}

/** Fetches or creates the per-chat record, refreshing identity fields. */
async function getBotUser(chat: any, from: any): Promise<IBotUser> {
    const chatId = String(chat.id);

    const update: Record<string, unknown> = {
        chatId,
        lastSeenAt: new Date(),
        isBlocked: false,
    };
    if (from?.id) update.telegramId = from.id;
    if (from?.first_name) update.firstName = from.first_name;
    if (from?.username) update.username = from.username;

    return BotUser.findOneAndUpdate(
        { chatId },
        { $set: update, $setOnInsert: { language: 'uz' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    ) as unknown as IBotUser;
}

export class BotHandlers {
    constructor(private readonly deps: HandlerDeps) {}

    /** Single entry point for both long-polling and the webhook route. */
    public async handleUpdate(update: any): Promise<void> {
        if (update.callback_query) return this.onCallbackQuery(update.callback_query);
        if (update.my_chat_member) return this.onChatMemberUpdate(update.my_chat_member);

        const message = update.message ?? update.channel_post;
        if (!message) return;

        if (message.contact) return this.onContact(message);
        if (message.text) return this.onText(message);
    }

    // ── Messages ─────────────────────────────────────────────────────────

    private async onText(message: any): Promise<void> {
        const chatId = String(message.chat.id);
        const text: string = message.text.trim();

        // Group chats are for operators, not the customer menu. Only answer
        // /start there so the admin can read back the chat id for configuration.
        const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';
        if (isGroup) {
            if (/^\/(start|id)/i.test(text)) {
                await this.deps.client.sendMessage(
                    chatId,
                    `🆔 <b>Chat ID:</b> <code>${escapeHtml(chatId)}</code>\n\n` +
                    'Bu qiymatni <code>TELEGRAM_ADMIN_CHAT_ID</code> ga yozing.',
                );
            }
            return;
        }

        if (!dbReady()) {
            // Without a database we cannot even read the user's language.
            await this.deps.client.sendMessage(chatId, t('uz').dbUnavailable);
            return;
        }

        const botUser = await getBotUser(message.chat, message.from);
        const lang = normalizeLang(botUser.language);
        const x = t(lang);

        // A pending contact request takes priority over menu matching.
        if (botUser.awaiting === 'phone' && text === x.btnBack) {
            await BotUser.updateOne({ chatId }, { $set: { awaiting: null } });
            await this.showMainMenu(chatId, lang);
            return;
        }

        if (/^\/start/i.test(text)) return this.onStart(chatId, lang, botUser);
        if (/^\/help/i.test(text)) return this.showMainMenu(chatId, lang);
        if (/^\/lang/i.test(text)) return this.askLanguage(chatId, lang);
        if (/^\/id/i.test(text)) {
            await this.deps.client.sendMessage(chatId, `🆔 <code>${escapeHtml(chatId)}</code>`);
            return;
        }

        // Match menu buttons across every language so switching language
        // mid-conversation never strands the user with a dead keyboard.
        const action = this.matchMenuAction(text);
        switch (action) {
            case 'products': return this.showProducts(chatId, lang);
            case 'orders': return this.showOrders(chatId, lang, botUser);
            case 'branches': return this.showBranches(chatId, lang);
            case 'support': return this.showSupport(chatId, lang);
            case 'language': return this.askLanguage(chatId, lang);
            default:
                await this.deps.client.sendMessage(chatId, x.unknown, mainKeyboard(lang));
        }
    }

    /** Maps button text in any supported language to a stable action name. */
    private matchMenuAction(text: string): string | null {
        const normalized = text.toLowerCase();
        const table: Record<string, string[]> = {
            products: ['mahsulot', 'товар', 'product', 'katalog', 'каталог'],
            orders: ['buyurtmalarim', 'мои заказ', 'my order', 'buyurtma'],
            branches: ['filial', 'филиал', 'branch', 'xarita', 'карта'],
            support: ['aloqa', 'контакт', 'contact', 'qo\'llab', 'поддержк', 'support'],
            language: ['til', 'язык', 'language', '🌐'],
        };

        for (const [action, needles] of Object.entries(table)) {
            if (needles.some((n) => normalized.includes(n))) return action;
        }
        return null;
    }

    private async onStart(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const name = escapeHtml(botUser.firstName || 'mehmon');
        await this.deps.client.sendMessage(chatId, t(lang).welcome(name), mainKeyboard(lang));
        await this.deps.client.sendMessage(
            chatId,
            t(lang).orderCta,
            siteLinksKeyboard(lang, this.deps.siteUrl),
        );
    }

    private async showMainMenu(chatId: string, lang: BotLang): Promise<void> {
        await this.deps.client.sendMessage(chatId, t(lang).mainMenu, mainKeyboard(lang));
    }

    private async askLanguage(chatId: string, lang: BotLang): Promise<void> {
        await this.deps.client.sendMessage(chatId, t(lang).chooseLanguage, languageKeyboard());
    }

    // ── Content ──────────────────────────────────────────────────────────

    private async showProducts(chatId: string, lang: BotLang): Promise<void> {
        const x = t(lang);
        await this.deps.client.sendChatAction(chatId);

        const products = await Product.find({ status: 'approved', inStock: true })
            .sort({ category: 1, price: 1 })
            .limit(MAX_PRODUCTS_SHOWN)
            .lean();

        if (products.length === 0) {
            await this.deps.client.sendMessage(chatId, x.productsEmpty, mainKeyboard(lang));
            return;
        }

        const lines = products.map(
            (p: any) => `• <b>${escapeHtml(p.name)}</b>\n   ${formatPrice(p.price)}`,
        );

        const body = `${x.productsTitle}\n\n${lines.join('\n')}\n\n${x.productsFooter}`;
        await this.deps.client.sendMessage(chatId, body, orderCtaKeyboard(lang, this.deps.siteUrl));
    }

    private async showBranches(chatId: string, lang: BotLang): Promise<void> {
        const x = t(lang);
        await this.deps.client.sendChatAction(chatId);

        const branches = await Branch.find({ isActive: true }).limit(MAX_BRANCHES_SHOWN).lean();

        if (branches.length === 0) {
            await this.deps.client.sendMessage(chatId, x.branchesEmpty, mainKeyboard(lang));
            return;
        }

        const blocks = branches.map((b: any) => [
            `🏢 <b>${escapeHtml(b.name)}</b>`,
            `📍 ${escapeHtml(b.address)}`,
            b.workingHours ? `⏰ ${escapeHtml(b.workingHours)}` : '',
            b.phone ? `📞 <code>${escapeHtml(b.phone)}</code>` : '',
        ].filter(Boolean).join('\n'));

        await this.deps.client.sendMessage(
            chatId,
            `${x.branchesTitle}\n\n${blocks.join('\n\n')}`,
            mainKeyboard(lang),
        );

        // Send a pin for the first branch that has usable coordinates.
        const located = branches.find(
            (b: any) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude),
        ) as any;
        if (located) {
            await this.deps.client.sendLocation(chatId, located.latitude, located.longitude);
        }
    }

    private async showOrders(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = t(lang);

        // Orders are personal data — require a verified account link first.
        if (!botUser.userId) {
            await BotUser.updateOne({ chatId }, { $set: { awaiting: 'phone' } });
            await this.deps.client.sendMessage(chatId, x.ordersNeedPhone, requestPhoneKeyboard(lang));
            return;
        }

        await this.deps.client.sendChatAction(chatId);

        const orders = await Order.find({ userId: botUser.userId })
            .sort({ createdAt: -1 })
            .limit(MAX_ORDERS_SHOWN)
            .lean();

        if (orders.length === 0) {
            await this.deps.client.sendMessage(chatId, x.ordersEmpty, mainKeyboard(lang));
            return;
        }

        const blocks = orders.map((o: any) => {
            const total = (o.items || []).reduce(
                (sum: number, i: any) => sum + (i.priceSnapshot || 0) * (i.qty || 0),
                0,
            );
            const items = (o.items || [])
                .map((i: any) => `   • ${escapeHtml(i.nameSnapshot)} × ${i.qty}`)
                .join('\n');

            return [
                `<b>#${escapeHtml(String(o._id).slice(-6).toUpperCase())}</b> — ${statusLabel(o.status, lang)}`,
                items,
                `   💰 <b>${formatPrice(total)}</b>`,
                o.deliveryDate ? `   📅 ${escapeHtml(o.deliveryDate)} ${escapeHtml(o.deliveryTimeSlot || '')}` : '',
            ].filter(Boolean).join('\n');
        });

        await this.deps.client.sendMessage(
            chatId,
            `${x.ordersTitle}\n\n${blocks.join('\n\n')}`,
            mainKeyboard(lang),
        );
    }

    private async showSupport(chatId: string, lang: BotLang): Promise<void> {
        await this.deps.client.sendMessage(
            chatId,
            t(lang).supportText(this.deps.siteUrl),
            mainKeyboard(lang),
        );
    }

    // ── Contact sharing ──────────────────────────────────────────────────

    private async onContact(message: any): Promise<void> {
        const chatId = String(message.chat.id);
        if (!dbReady()) {
            await this.deps.client.sendMessage(chatId, t('uz').dbUnavailable);
            return;
        }

        const botUser = await getBotUser(message.chat, message.from);
        const lang = normalizeLang(botUser.language);
        const x = t(lang);

        // Telegram lets users forward somebody else's contact card. Only accept
        // a contact that belongs to the sender, otherwise anyone could link to
        // — and then read the orders of — an account they do not own.
        if (message.contact.user_id !== message.from?.id) {
            await this.deps.client.sendMessage(chatId, x.phoneInvalid, requestPhoneKeyboard(lang));
            return;
        }

        const phone = normalizePhone(message.contact.phone_number);
        if (!phone) {
            await this.deps.client.sendMessage(chatId, x.phoneInvalid, requestPhoneKeyboard(lang));
            return;
        }

        const user = await User.findOne({ phone }).lean();
        if (!user) {
            await BotUser.updateOne({ chatId }, { $set: { phone, awaiting: null } });
            await this.deps.client.sendMessage(
                chatId,
                x.ordersNotRegistered(phone),
                siteLinksKeyboard(lang, this.deps.siteUrl),
            );
            return;
        }

        await BotUser.updateOne(
            { chatId },
            { $set: { phone, userId: user._id, awaiting: null } },
        );

        await this.deps.client.sendMessage(
            chatId,
            x.phoneLinked(escapeHtml((user as any).name || phone)),
            mainKeyboard(lang),
        );

        const refreshed = await BotUser.findOne({ chatId });
        if (refreshed) await this.showOrders(chatId, lang, refreshed);
    }

    // ── Callback queries ─────────────────────────────────────────────────

    private async onCallbackQuery(cb: any): Promise<void> {
        const data: string = cb.data || '';

        if (data.startsWith('lang:')) return this.onLanguageChosen(cb, data.slice(5));
        if (data.startsWith('st:')) return this.onStatusButton(cb, data);

        await this.deps.client.answerCallbackQuery(cb.id, 'Noma\'lum amal.');
    }

    private async onLanguageChosen(cb: any, raw: string): Promise<void> {
        const chatId = String(cb.message.chat.id);
        const lang = normalizeLang(raw);

        if (dbReady()) {
            await BotUser.updateOne({ chatId }, { $set: { language: lang } }, { upsert: true });
        }

        await this.deps.client.answerCallbackQuery(cb.id, t(lang).languageSet);
        await this.deps.client.sendMessage(chatId, t(lang).languageSet, mainKeyboard(lang));
    }

    /**
     * Operator pressed a status button on an order card in the admin group.
     */
    private async onStatusButton(cb: any, data: string): Promise<void> {
        const client = this.deps.client;
        const [, status, orderId] = data.split(':');
        const operator = cb.from?.first_name || 'Operator';

        if (!OPERATOR_STATUSES.includes(status as any)) {
            await client.answerCallbackQuery(cb.id, 'Noma\'lum amal.', true);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            await client.answerCallbackQuery(cb.id, '❌ Buyurtma ID noto\'g\'ri.', true);
            return;
        }

        if (!dbReady()) {
            await client.answerCallbackQuery(cb.id, '⚠️ Baza mavjud emas. Qayta urinib ko\'ring.', true);
            return;
        }

        let order;
        try {
            order = await Order.findById(orderId);
        } catch (err) {
            console.error('[Telegram] Order lookup failed:', (err as Error).message);
            await client.answerCallbackQuery(cb.id, '⚠️ Bazaga ulanishda xatolik.', true);
            return;
        }

        if (!order) {
            await client.answerCallbackQuery(cb.id, '❌ Buyurtma topilmadi.', true);
            return;
        }

        // Pressing the same button twice is a no-op rather than a spurious
        // "updated" toast and a redundant customer notification.
        if (order.status === status) {
            await client.answerCallbackQuery(cb.id, `Allaqachon: ${statusLabel(status)}`);
            return;
        }

        // A delivered or cancelled order is terminal; reopening it from a stale
        // message would silently contradict the dashboard.
        if (order.status === 'delivered' || order.status === 'cancelled') {
            await client.answerCallbackQuery(
                cb.id,
                `❌ Buyurtma yakunlangan (${statusLabel(order.status)}).`,
                true,
            );
            return;
        }

        order.status = status as typeof order.status;
        await order.save();

        await client.answerCallbackQuery(cb.id, `${statusLabel(status)} — ${operator}`);

        const chatId = String(cb.message.chat.id);
        const original = escapeHtml(cb.message.text || '');
        const updated = `${original}\n\n📌 <b>Holat:</b> ${statusLabel(status)}\n👤 <b>Bajardi:</b> ${escapeHtml(operator)}`;

        await client.editMessageText(chatId, cb.message.message_id, updated, orderActionKeyboard(orderId, status));

        // Tell the customer too, if their Telegram account is linked.
        await this.notifyCustomer(order);
    }

    /** Sends an order status update to the customer's linked Telegram chat. */
    public async notifyCustomer(order: any): Promise<void> {
        if (!dbReady()) return;

        try {
            const botUser = await BotUser.findOne({ userId: order.userId, isBlocked: false }).lean();
            if (!botUser) return;

            const lang = normalizeLang((botUser as any).language);
            const shortId = String(order._id).slice(-6).toUpperCase();

            await this.deps.client.sendMessage(
                (botUser as any).chatId,
                t(lang).statusChanged(escapeHtml(shortId), statusLabel(order.status, lang)),
            );
        } catch (err) {
            console.warn('[Telegram] Customer notification failed:', (err as Error).message);
        }
    }

    // ── Lifecycle events ─────────────────────────────────────────────────

    /** Marks chats that blocked the bot so we stop messaging them. */
    private async onChatMemberUpdate(update: any): Promise<void> {
        const status = update.new_chat_member?.status;
        const chatId = String(update.chat?.id ?? '');
        if (!chatId || !dbReady()) return;

        const blocked = status === 'kicked' || status === 'left';
        await BotUser.updateOne({ chatId }, { $set: { isBlocked: blocked } }).catch(() => undefined);
    }
}

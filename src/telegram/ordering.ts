import mongoose from 'mongoose';
import BotUser, { IBotUser, Address } from '../models/BotUser';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import { TelegramClient, escapeHtml } from './TelegramClient';
import { BotLang, t, statusLabel } from './texts';
import { ot, TIME_SLOTS, REGIONS } from './orderTexts';
import { createOrder, orderTotal, releaseStockFor } from '../services/OrderService';
import { BottleService } from '../services/BottleService';
import { DeliveryService } from '../services/DeliveryService';
import Subscription, { nextOccurrence } from '../models/Subscription';

/**
 * Ordering inside Telegram: catalogue, basket, checkout, order history.
 *
 * The bot used to be a brochure — it listed prices and then sent people to the
 * website to actually buy. Everything the site can do is here now, and it goes
 * through the same OrderService the website posts to, so validation, pricing
 * and the operator notification are identical whichever way an order arrives.
 *
 * Basket and checkout state live on the BotUser document rather than in memory,
 * because the bot runs on serverless functions: a process holding a Map is
 * frozen after each update and a customer's cart would vanish between messages.
 *
 * `callback_data` is capped at 64 bytes by Telegram. Every action here is
 * `<verb>:<24-char ObjectId>` at most — 30 bytes, with room to spare.
 */

const CHECKOUT_STEPS = 5;
const MAX_CATALOG = 12;
const MAX_ORDERS = 8;
const DATE_CHOICES = 7;

/** Statuses a customer may still call off themselves. */
const CANCELLABLE = ['pending', 'confirmed'];

const money = (v: number): string => `${Math.round(v).toLocaleString('ru-RU')} so'm`;
const code = (id: unknown): string => String(id).slice(-6).toUpperCase();

const addressLine = (a: Partial<Address>): string =>
    [a.region, a.city, a.district, a.street, a.house].filter(Boolean).join(', ');

export interface OrderingDeps {
    client: TelegramClient;
    siteUrl: string;
}

export class Ordering {
    constructor(private readonly deps: OrderingDeps) {}

    private get client() { return this.deps.client; }

    // ── Catalogue ────────────────────────────────────────────────────────

    async showCatalog(chatId: string, lang: BotLang): Promise<void> {
        const x = ot(lang);
        await this.client.sendChatAction(chatId);

        const products = await Product.find({ status: 'approved', inStock: true })
            .sort({ price: 1 })
            .limit(MAX_CATALOG)
            .lean();

        if (products.length === 0) {
            await this.client.sendMessage(chatId, x.catalogEmpty);
            return;
        }

        await this.client.sendMessage(
            chatId,
            `${x.catalogTitle}\n\n${x.catalogPick}`,
            {
                inline_keyboard: [
                    ...products.map((p: any) => [{
                        text: `${p.name} — ${money(p.price)}`,
                        callback_data: `p:${p._id}`,
                    }]),
                    [{ text: x.btnCart, callback_data: 'cart' }],
                ],
            },
        );
    }

    async showProduct(chatId: string, lang: BotLang, productId: string, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(productId)) return;

        const product: any = await Product.findById(productId).lean();
        if (!product) return;

        const inCart = (botUser.cart || []).find(i => String(i.productId) === productId);

        const body = [
            `💧 <b>${escapeHtml(product.name)}</b>`,
            product.description ? `\n${escapeHtml(product.description)}` : '',
            `\n💰 <b>${money(product.price)}</b>`,
            product.inStock ? '' : `\n${x.outOfStock}`,
            inCart ? `\n${x.inCart(inCart.qty)}` : '',
        ].filter(Boolean).join('\n');

        const rows: any[] = [];
        if (product.inStock) {
            rows.push(inCart
                ? [
                    { text: '➖', callback_data: `dec:${productId}` },
                    { text: `${inCart.qty}`, callback_data: 'noop' },
                    { text: '➕', callback_data: `inc:${productId}` },
                ]
                : [{ text: x.btnAdd, callback_data: `add:${productId}` }]);
        }
        rows.push([
            { text: x.btnBackToCatalog, callback_data: 'cat' },
            { text: x.btnCart, callback_data: 'cart' },
        ]);

        // A product photo makes the catalogue readable at a glance, but an
        // unreachable or oversized image makes sendPhoto fail — in which case
        // the text still has to arrive.
        if (product.imageUrl && /^https?:\/\//.test(product.imageUrl)) {
            const sent = await this.client.sendPhoto(chatId, product.imageUrl, body, { inline_keyboard: rows });
            if (sent) return;
        }

        await this.client.sendMessage(chatId, body, { inline_keyboard: rows });
    }

    // ── Basket ───────────────────────────────────────────────────────────

    async addToCart(chatId: string, productId: string, delta: number): Promise<IBotUser | null> {
        if (!mongoose.Types.ObjectId.isValid(productId)) return null;

        const botUser = await BotUser.findOne({ chatId });
        if (!botUser) return null;

        const cart = [...(botUser.cart || [])];
        const at = cart.findIndex(i => String(i.productId) === productId);

        if (at === -1) {
            if (delta > 0) {
                cart.push({ productId: new mongoose.Types.ObjectId(productId), qty: delta });
            }
        } else {
            const next = cart[at].qty + delta;
            if (next <= 0) cart.splice(at, 1);
            else cart[at] = { ...cart[at], qty: Math.min(next, 100) };
        }

        botUser.cart = cart as any;
        await botUser.save();
        return botUser;
    }

    async removeFromCart(chatId: string, productId: string): Promise<void> {
        await BotUser.updateOne(
            { chatId },
            { $pull: { cart: { productId: new mongoose.Types.ObjectId(productId) } } },
        );
    }

    async clearCart(chatId: string): Promise<void> {
        await BotUser.updateOne({ chatId }, { $set: { cart: [] } });
    }

    /** Resolves the basket against live products, dropping anything withdrawn. */
    private async resolveCart(botUser: IBotUser) {
        const cart = botUser.cart || [];
        if (cart.length === 0) return { lines: [] as any[], total: 0, changed: false };

        const products = await Product.find({ _id: { $in: cart.map(i => i.productId) } }).lean();
        const byId = new Map(products.map((p: any) => [String(p._id), p]));

        const lines: any[] = [];
        let changed = false;

        for (const item of cart) {
            const p: any = byId.get(String(item.productId));
            // A product deleted or withdrawn after it was added would otherwise
            // fail validation at the very last step, after the customer has
            // typed out a full address.
            if (!p || !p.inStock) { changed = true; continue; }
            lines.push({ id: String(p._id), name: p.name, price: p.price, qty: item.qty });
        }

        const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
        return { lines, total, changed };
    }

    async showCart(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        const { lines, total, changed } = await this.resolveCart(botUser);

        if (changed) {
            await BotUser.updateOne(
                { chatId },
                { $set: { cart: lines.map(l => ({ productId: new mongoose.Types.ObjectId(l.id), qty: l.qty })) } },
            );
        }

        if (lines.length === 0) {
            await this.client.sendMessage(chatId, x.cartEmpty, {
                inline_keyboard: [[{ text: x.btnCatalog, callback_data: 'cat' }]],
            });
            return;
        }

        // Delivery is quoted against the address used last time, so a returning
        // customer sees the real figure rather than a goods-only total that
        // changes at the last step.
        const region = botUser.lastAddress?.region;
        const q = region ? await DeliveryService.quote(region, total) : null;
        const fee = q?.ok ? q.fee : null;

        const body = [
            x.cartTitle,
            '',
            ...lines.map(l => `• <b>${escapeHtml(l.name)}</b>\n   ${l.qty} × ${money(l.price)} = <b>${money(l.qty * l.price)}</b>`),
            fee !== null ? `\n${x.deliveryFee}: <b>${fee === 0 ? x.freeDelivery : money(fee)}</b>` : '',
            x.cartTotal(money(total + (fee ?? 0))),
        ].filter(Boolean).join('\n');

        const rows = lines.map(l => ([
            { text: '➖', callback_data: `dec:${l.id}` },
            { text: `${l.qty} × ${l.name}`.slice(0, 28), callback_data: `p:${l.id}` },
            { text: '➕', callback_data: `inc:${l.id}` },
            { text: x.btnRemove, callback_data: `rm:${l.id}` },
        ]));

        rows.push([{ text: x.btnCheckout, callback_data: 'co' }]);
        rows.push([{ text: x.btnSubscribe, callback_data: 'sub' }]);
        rows.push([
            { text: x.btnBackToCatalog, callback_data: 'cat' },
            { text: x.btnClear, callback_data: 'clr' },
        ]);

        await this.client.sendMessage(chatId, body, { inline_keyboard: rows });
    }

    // ── Checkout ─────────────────────────────────────────────────────────

    /** Returns false when the customer has to link a phone number first. */
    async beginCheckout(chatId: string, lang: BotLang, botUser: IBotUser): Promise<boolean> {
        const x = ot(lang);
        const { lines } = await this.resolveCart(botUser);

        if (lines.length === 0) {
            await this.client.sendMessage(chatId, x.cartEmpty);
            return true;
        }

        if (!botUser.userId) {
            await this.client.sendMessage(chatId, x.needPhone);
            return false;
        }

        await BotUser.updateOne({ chatId }, { $set: { draft: {}, awaiting: 'region' } });

        const rows: any[] = [];
        // Most orders are repeats to the same door; offering the previous
        // address turns five prompts into one tap.
        if (botUser.lastAddress?.region) {
            rows.push([{
                text: x.btnSameAddress(addressLine(botUser.lastAddress)).slice(0, 60),
                callback_data: 'same',
            }]);
        }
        for (const r of REGIONS) rows.push([{ text: r, callback_data: `rg:${r}` }]);
        rows.push([{ text: x.btnCancelCheckout, callback_data: 'xco' }]);

        await this.client.sendMessage(
            chatId,
            x.askRegion + x.stepHint(1, CHECKOUT_STEPS),
            { inline_keyboard: rows },
        );
        return true;
    }

    /** Handles a free-text answer during checkout. Returns true if consumed. */
    async onCheckoutText(chatId: string, lang: BotLang, botUser: IBotUser, text: string): Promise<boolean> {
        const step = botUser.awaiting;
        if (!step || !['city', 'district', 'street', 'house'].includes(step)) return false;

        const x = ot(lang);
        const value = text.trim();

        if (value.length < 2) {
            await this.client.sendMessage(chatId, x.tooShort);
            return true;
        }

        const draft = { ...(botUser.draft || {}), [step]: value };

        const next: Record<string, { field: any; ask: string; index: number } | null> = {
            city: { field: 'district', ask: x.askDistrict, index: 3 },
            district: { field: 'street', ask: x.askStreet, index: 4 },
            street: { field: 'house', ask: x.askHouse, index: 5 },
            house: null,
        };

        const after = next[step];
        if (after) {
            await BotUser.updateOne({ chatId }, { $set: { draft, awaiting: after.field } });
            await this.client.sendMessage(
                chatId,
                after.ask + x.stepHint(after.index, CHECKOUT_STEPS),
                { inline_keyboard: [[{ text: x.btnCancelCheckout, callback_data: 'xco' }]] },
            );
            return true;
        }

        await BotUser.updateOne({ chatId }, { $set: { draft, awaiting: null } });
        await this.askDate(chatId, lang);
        return true;
    }

    async onRegionChosen(chatId: string, lang: BotLang, region: string): Promise<void> {
        const x = ot(lang);
        await BotUser.updateOne({ chatId }, { $set: { 'draft.region': region, awaiting: 'city' } });
        await this.client.sendMessage(
            chatId,
            x.askCity + x.stepHint(2, CHECKOUT_STEPS),
            { inline_keyboard: [[{ text: x.btnCancelCheckout, callback_data: 'xco' }]] },
        );
    }

    async onSameAddress(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const a = botUser.lastAddress;
        if (!a) return this.onRegionChosen(chatId, lang, REGIONS[0]);

        await BotUser.updateOne({ chatId }, { $set: { draft: { ...a }, awaiting: null } });
        await this.askDate(chatId, lang);
    }

    async askDate(chatId: string, lang: BotLang): Promise<void> {
        const x = ot(lang);
        const rows: any[] = [];

        for (let i = 0; i < DATE_CHOICES; i++) {
            const d = new Date(Date.now() + i * 86400000);
            const iso = d.toISOString().slice(0, 10);
            const label = i === 0 ? x.today
                : i === 1 ? x.tomorrow
                : `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            rows.push([{ text: `${label} — ${iso}`, callback_data: `dt:${iso}` }]);
        }
        rows.push([{ text: x.btnCancelCheckout, callback_data: 'xco' }]);

        await this.client.sendMessage(chatId, x.askDate, { inline_keyboard: rows });
    }

    async onDateChosen(chatId: string, lang: BotLang, iso: string): Promise<void> {
        const x = ot(lang);
        await BotUser.updateOne({ chatId }, { $set: { 'draft.deliveryDate': iso } });
        await this.client.sendMessage(chatId, x.askSlot, {
            inline_keyboard: [
                ...TIME_SLOTS.map((s, i) => [{ text: s, callback_data: `ts:${i}` }]),
                [{ text: x.btnCancelCheckout, callback_data: 'xco' }],
            ],
        });
    }

    async onSlotChosen(chatId: string, lang: BotLang, index: number): Promise<void> {
        const x = ot(lang);
        const slot = TIME_SLOTS[index];
        if (!slot) return;

        await BotUser.updateOne({ chatId }, { $set: { 'draft.deliveryTimeSlot': slot } });
        await this.client.sendMessage(chatId, x.askPayment, {
            inline_keyboard: [
                [{ text: x.payCash, callback_data: 'pm:cash' }],
                [{ text: x.payClick, callback_data: 'pm:click' }],
                [{ text: x.payPayme, callback_data: 'pm:payme' }],
                [{ text: x.btnCancelCheckout, callback_data: 'xco' }],
            ],
        });
    }

    async onPaymentChosen(chatId: string, lang: BotLang, method: string): Promise<void> {
        await BotUser.updateOne({ chatId }, { $set: { 'draft.paymentMethod': method } });

        const botUser = await BotUser.findOne({ chatId });
        if (botUser) await this.showConfirmation(chatId, lang, botUser);
    }

    private async showConfirmation(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        const d = botUser.draft || {};
        const { lines, total } = await this.resolveCart(botUser);

        const payLabel = d.paymentMethod === 'click' ? x.payClick
            : d.paymentMethod === 'payme' ? x.payPayme : x.payCash;

        const q = d.region ? await DeliveryService.quote(d.region, total) : null;
        const fee = q?.ok ? q.fee : null;

        const body = [
            x.confirmTitle,
            '',
            ...lines.map(l => `• ${escapeHtml(l.name)} × ${l.qty} — <b>${money(l.price * l.qty)}</b>`),
            '',
            `${x.confirmAddress}: ${escapeHtml(addressLine(d))}`,
            `${x.confirmWhen}: ${escapeHtml(d.deliveryDate || '')} ${escapeHtml(d.deliveryTimeSlot || '')}`,
            `${x.confirmPayment}: ${payLabel}`,
            fee !== null ? `${x.deliveryFee}: ${fee === 0 ? x.freeDelivery : money(fee)}` : '',
            '',
            `💰 <b>${money(total + (fee ?? 0))}</b>`,
        ].filter(Boolean).join('\n');

        await this.client.sendMessage(chatId, body, {
            inline_keyboard: [
                [{ text: x.btnConfirm, callback_data: 'ok' }],
                [{ text: x.btnCancelCheckout, callback_data: 'xco' }],
            ],
        });
    }

    async placeOrder(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        const d: any = botUser.draft || {};
        const { lines } = await this.resolveCart(botUser);

        if (lines.length === 0) {
            await this.client.sendMessage(chatId, x.cartEmpty);
            return;
        }
        if (!botUser.userId) {
            await this.client.sendMessage(chatId, x.needPhone);
            return;
        }

        const customer: any = await User.findById(botUser.userId).lean();

        const result = await createOrder(
            botUser.userId,
            {
                items: lines.map(l => ({ productId: l.id, qty: l.qty })),
                addressSnapshot: {
                    region: d.region, city: d.city, district: d.district,
                    street: d.street, house: d.house,
                },
                deliveryDate: d.deliveryDate,
                deliveryTimeSlot: d.deliveryTimeSlot,
                paymentMethod: d.paymentMethod,
            },
            { phone: customer?.phone || botUser.phone, name: customer?.name || botUser.firstName },
        );

        if (!result.ok) {
            await this.client.sendMessage(chatId, x.placeFailed(escapeHtml(result.message)));
            return;
        }

        // The basket is emptied only once the order really exists, so a
        // validation failure never costs the customer their selection.
        await BotUser.updateOne({ chatId }, {
            $set: {
                cart: [],
                draft: null,
                awaiting: null,
                lastAddress: {
                    region: d.region, city: d.city, district: d.district,
                    street: d.street, house: d.house,
                },
            },
        });

        await this.client.sendMessage(chatId, x.placed(code(result.order._id)), {
            inline_keyboard: [[{ text: t(lang).btnMyOrders, callback_data: 'ords' }]],
        });
    }

    async cancelCheckout(chatId: string, lang: BotLang): Promise<void> {
        await BotUser.updateOne({ chatId }, { $set: { draft: null, awaiting: null } });
        await this.client.sendMessage(chatId, ot(lang).checkoutCancelled);
    }

    // ── Order history ────────────────────────────────────────────────────

    async showOrderList(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        const orders = await Order.find({ userId: botUser.userId })
            .sort({ createdAt: -1 })
            .limit(MAX_ORDERS)
            .lean();

        if (orders.length === 0) {
            await this.client.sendMessage(chatId, t(lang).ordersEmpty);
            return;
        }

        await this.client.sendMessage(chatId, t(lang).ordersTitle, {
            inline_keyboard: orders.map((o: any) => [{
                text: `#${code(o._id)} — ${statusLabel(o.status, lang)} — ${money(orderTotal(o))}`,
                callback_data: `o:${o._id}`,
            }]),
        });
    }

    async showOrder(chatId: string, lang: BotLang, botUser: IBotUser, orderId: string): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(orderId)) return;

        const order: any = await Order.findById(orderId).lean();
        // Scoped to the caller's own orders: without this, anyone who guessed
        // an id could read another customer's address and phone number.
        if (!order || String(order.userId) !== String(botUser.userId)) {
            await this.client.sendMessage(chatId, x.orderNotFound);
            return;
        }

        const body = [
            x.orderTitle(code(order._id)),
            `${statusLabel(order.status, lang)}`,
            '',
            ...(order.items || []).map((i: any) =>
                `• ${escapeHtml(i.nameSnapshot)} × ${i.qty} — <b>${money(i.priceSnapshot * i.qty)}</b>`),
            '',
            `${x.confirmAddress}: ${escapeHtml(addressLine(order.addressSnapshot || {}))}`,
            `${x.confirmWhen}: ${escapeHtml(order.deliveryDate || '')} ${escapeHtml(order.deliveryTimeSlot || '')}`,
            '',
            `💰 <b>${money(orderTotal(order))}</b>`,
        ].join('\n');

        const rows: any[] = [[{ text: x.btnRepeat, callback_data: `rep:${order._id}` }]];
        if (CANCELLABLE.includes(order.status)) {
            rows.push([{ text: x.btnCancelOrder, callback_data: `xo:${order._id}` }]);
        }
        rows.push([{ text: t(lang).btnMyOrders, callback_data: 'ords' }]);

        await this.client.sendMessage(chatId, body, { inline_keyboard: rows });
    }

    async cancelOrder(chatId: string, lang: BotLang, botUser: IBotUser, orderId: string): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(orderId)) return;

        const order: any = await Order.findById(orderId);
        if (!order || String(order.userId) !== String(botUser.userId)) {
            await this.client.sendMessage(chatId, x.orderNotFound);
            return;
        }

        // Once a courier is carrying it, calling it off is a phone call.
        if (!CANCELLABLE.includes(order.status)) {
            await this.client.sendMessage(chatId, x.cannotCancel);
            return;
        }

        order.status = 'cancelled';
        await order.save();
        // Same bookkeeping as a cancellation from the admin panel: the stock this
        // order had claimed goes back on the shelf.
        await releaseStockFor(order)
            .catch((err: any) => console.error('[Bot] Stock release failed:', err?.message || err));
        await this.client.sendMessage(chatId, x.orderCancelled);
    }

    // ── Returnable containers ────────────────────────────────────────────

    async showBottles(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);

        if (!botUser.userId) {
            await this.client.sendMessage(chatId, x.needPhone);
            return;
        }

        const { balance, movements } = await BottleService.statementFor(botUser.userId, 6);

        const history = movements.map((m: any) => {
            const when = new Date(m.createdAt).toISOString().slice(0, 10);
            const sign = m.delta > 0 ? '➕' : '➖';
            return `${sign} ${Math.abs(m.delta)} — ${when}${m.note ? ' · ' + escapeHtml(m.note) : ''}`;
        });

        const body = [
            x.bottlesTitle,
            '',
            balance > 0 ? x.bottlesOwed(balance) : x.bottlesNone,
            balance > 0 ? x.bottlesHint : '',
            history.length ? '\n' + history.join('\n') : '',
        ].filter(Boolean).join('\n');

        await this.client.sendMessage(chatId, body);
    }

    // ── Standing orders ──────────────────────────────────────────────────

    async askSubscriptionDay(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        const { lines } = await this.resolveCart(botUser);

        if (lines.length === 0) { await this.client.sendMessage(chatId, x.cartEmpty); return; }
        if (!botUser.userId) { await this.client.sendMessage(chatId, x.needPhone); return; }
        // A standing order needs somewhere to go, and the only address the bot
        // knows is the one from a previous checkout.
        if (!botUser.lastAddress?.region) {
            await this.client.sendMessage(chatId, x.needPhone === '' ? '' : x.subsNone);
            return;
        }

        await this.client.sendMessage(chatId, x.subsAskDay, {
            inline_keyboard: [
                ...x.weekdays.map((d, i) => [{ text: d, callback_data: `sd:${i + 1}` }]),
                [{ text: x.btnCancelCheckout, callback_data: 'xco' }],
            ],
        });
    }

    async createSubscription(chatId: string, lang: BotLang, botUser: IBotUser, weekday: number): Promise<void> {
        const x = ot(lang);
        const { lines } = await this.resolveCart(botUser);
        const address = botUser.lastAddress;

        if (lines.length === 0 || !botUser.userId || !address?.region) {
            await this.client.sendMessage(chatId, x.cartEmpty);
            return;
        }

        const slot = TIME_SLOTS[1];
        await Subscription.create({
            userId: botUser.userId,
            items: lines.map(l => ({ productId: new mongoose.Types.ObjectId(l.id), qty: l.qty })),
            addressSnapshot: address,
            weekday,
            deliveryTimeSlot: slot,
            paymentMethod: 'cash',
            nextRunAt: nextOccurrence(weekday),
        });

        await this.client.sendMessage(chatId, x.subsCreated(x.weekdays[weekday - 1], slot));
        await this.showSubscriptions(chatId, lang, botUser);
    }

    async showSubscriptions(chatId: string, lang: BotLang, botUser: IBotUser): Promise<void> {
        const x = ot(lang);
        if (!botUser.userId) { await this.client.sendMessage(chatId, x.needPhone); return; }

        const subs = await Subscription.find({ userId: botUser.userId }).sort({ createdAt: -1 }).limit(5).lean();
        if (subs.length === 0) { await this.client.sendMessage(chatId, x.subsNone); return; }

        for (const sub of subs as any[]) {
            const items = (sub.items || []).length;
            const body = [
                x.subsTitle,
                '',
                `📅 ${x.weekdays[sub.weekday - 1]}, ${escapeHtml(sub.deliveryTimeSlot)}`,
                `📦 ${items} tur mahsulot`,
                sub.isActive ? '▶️ Faol' : '⏸ To\'xtatilgan',
                sub.nextRunAt ? `➡️ ${new Date(sub.nextRunAt).toISOString().slice(0, 10)}` : '',
            ].filter(Boolean).join('\n');

            await this.client.sendMessage(chatId, body, {
                inline_keyboard: [[
                    sub.isActive
                        ? { text: x.btnPause, callback_data: `sp:${sub._id}` }
                        : { text: x.btnResume, callback_data: `sr:${sub._id}` },
                    { text: x.btnDelete, callback_data: `sx:${sub._id}` },
                ]],
            });
        }
    }

    async toggleSubscription(chatId: string, lang: BotLang, botUser: IBotUser, id: string, active: boolean): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(id)) return;

        // Scoped to the caller so one chat cannot pause another customer's order.
        const sub = await Subscription.findOne({ _id: id, userId: botUser.userId });
        if (!sub) { await this.client.sendMessage(chatId, x.orderNotFound); return; }

        sub.isActive = active;
        if (active) sub.nextRunAt = nextOccurrence(sub.weekday);
        await sub.save();

        await this.client.sendMessage(chatId, active ? x.subsResumed : x.subsPaused);
    }

    async deleteSubscription(chatId: string, lang: BotLang, botUser: IBotUser, id: string): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(id)) return;
        await Subscription.findOneAndDelete({ _id: id, userId: botUser.userId });
        await this.client.sendMessage(chatId, x.subsRemoved);
    }

    async repeatOrder(chatId: string, lang: BotLang, botUser: IBotUser, orderId: string): Promise<void> {
        const x = ot(lang);
        if (!mongoose.Types.ObjectId.isValid(orderId)) return;

        const order: any = await Order.findById(orderId).lean();
        if (!order || String(order.userId) !== String(botUser.userId)) {
            await this.client.sendMessage(chatId, x.orderNotFound);
            return;
        }

        const cart = (order.items || []).map((i: any) => ({ productId: i.productId, qty: i.qty }));
        await BotUser.updateOne({ chatId }, { $set: { cart } });

        await this.client.sendMessage(chatId, x.repeatAdded);

        const refreshed = await BotUser.findOne({ chatId });
        if (refreshed) await this.showCart(chatId, lang, refreshed);
    }
}

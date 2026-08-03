import mongoose from 'mongoose';
import Subscription, { nextOccurrence } from '../models/Subscription';
import Order from '../models/Order';
import User from '../models/User';
import { createOrder } from './OrderService';
import { TelegramBotService } from './TelegramBotService';
import BotUser from '../models/BotUser';

/**
 * Standing orders, and nudges to customers who have gone quiet.
 *
 * Both run from one scheduled call so the business gets its repeat revenue
 * without anyone remembering to chase it. Water is bought on a rhythm; the shop
 * previously had to win each of those purchases from scratch.
 */

/** Days of silence before a customer is reminded. */
const REMIND_AFTER_DAYS = 14;
/** Never nudge the same person more often than this. */
const REMIND_COOLDOWN_DAYS = 21;

export interface RunResult {
    ordersCreated: number;
    subscriptionsRun: number;
    failures: { subscriptionId: string; reason: string }[];
    remindersSent: number;
}

/**
 * Creates the orders that are due, then moves each subscription on a week.
 *
 * `nextRunAt` is advanced whether or not the order succeeded. A subscription
 * that keeps failing — a product withdrawn, a region no longer served — would
 * otherwise stay due for ever and retry on every single run, and the customer
 * would get the same failure message each time.
 */
export async function runDueSubscriptions(now = new Date()): Promise<RunResult> {
    const due = await Subscription.find({ isActive: true, nextRunAt: { $lte: now } }).limit(200);

    const result: RunResult = {
        ordersCreated: 0,
        subscriptionsRun: due.length,
        failures: [],
        remindersSent: 0,
    };

    for (const sub of due) {
        const customer: any = await User.findById(sub.userId).lean();

        // The delivery lands on the day the subscription fires.
        const deliveryDate = new Date(sub.nextRunAt).toISOString().slice(0, 10);

        const created = await createOrder(
            sub.userId,
            {
                items: sub.items.map(i => ({
                    productId: String(i.productId),
                    qty: i.qty,
                    // Absent on standing orders created before the choice existed;
                    // those were set up as returnable, so that is what they stay.
                    returnBottle: i.returnBottle !== false,
                })),
                addressSnapshot: sub.addressSnapshot,
                deliveryDate,
                deliveryTimeSlot: sub.deliveryTimeSlot,
                paymentMethod: sub.paymentMethod,
            },
            { phone: customer?.phone, name: customer?.name },
        ).catch((err: any) => ({ ok: false as const, status: 500, message: err?.message || 'xato' }));

        sub.lastRunAt = now;
        sub.nextRunAt = nextOccurrence(sub.weekday, now);

        if (created.ok) {
            sub.createdOrders += 1;
            result.ordersCreated += 1;
            await notify(sub.userId, `🔁 <b>Doimiy buyurtmangiz yaratildi</b>\n\nYetkazish: ${deliveryDate} ${sub.deliveryTimeSlot}`);
        } else {
            result.failures.push({ subscriptionId: String(sub._id), reason: created.message });
            await notify(
                sub.userId,
                `⚠️ <b>Doimiy buyurtmangiz yaratilmadi</b>\n\n${created.message}\n\nIltimos, buyurtmani qo'lda bering yoki sozlamalarni tekshiring.`,
            );
        }

        await sub.save();
    }

    result.remindersSent = await sendReorderReminders(now);
    return result;
}

/**
 * Nudges customers who have not ordered in a while.
 *
 * Only customers with a linked Telegram chat are reachable, and the reminder is
 * keyed off their last order rather than a fixed calendar so a household that
 * orders fortnightly is never told it has gone quiet. Anyone with an active
 * subscription is skipped — their water is already coming.
 */
export async function sendReorderReminders(now = new Date()): Promise<number> {
    const staleBefore = new Date(now.getTime() - REMIND_AFTER_DAYS * 86400000);
    const cooldownBefore = new Date(now.getTime() - REMIND_COOLDOWN_DAYS * 86400000);

    const candidates = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: '$userId', lastOrder: { $max: '$createdAt' } } },
        { $match: { lastOrder: { $lte: staleBefore } } },
        { $limit: 200 },
    ]);

    let sent = 0;
    for (const c of candidates) {
        const active = await Subscription.countDocuments({ userId: c._id, isActive: true });
        if (active > 0) continue;

        const chat = await BotUser.findOne({ userId: c._id, isBlocked: false });
        if (!chat) continue;
        if (chat.lastRemindedAt && chat.lastRemindedAt > cooldownBefore) continue;

        const ok = await notify(
            c._id,
            '💧 <b>Suv tugadimi?</b>\n\nOxirgi buyurtmangizdan bir muncha vaqt o\'tdi. '
            + 'Bir bosishda takrorlashingiz mumkin — /orders',
        );
        if (ok) {
            chat.lastRemindedAt = now;
            await chat.save();
            sent += 1;
        }
    }

    return sent;
}

/** Sends a message to a customer's Telegram chat, if they have linked one. */
async function notify(userId: mongoose.Types.ObjectId | string, text: string): Promise<boolean> {
    const chat = await BotUser.findOne({ userId, isBlocked: false }).lean();
    if (!chat) return false;
    return TelegramBotService.sendToChat((chat as any).chatId, text);
}

export const SubscriptionService = { runDueSubscriptions, sendReorderReminders };

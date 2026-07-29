import mongoose from 'mongoose';
import { z } from 'zod';
import Order from '../models/Order';
import Product from '../models/Product';
import { GoogleSheetsService } from './GoogleSheetsService';
import { TelegramBotService } from './TelegramBotService';

/**
 * Order creation, shared by the web API and the Telegram bot.
 *
 * Both entry points route through here so an order placed in the bot is
 * validated, priced and announced exactly like one placed on the site. When
 * this logic lived inside the Express controller the bot could only link out to
 * the website, and any rule added on one side silently did not exist on the
 * other.
 */

/*
 * Delivery fields were once `z.string().min(1)`, which is no validation at
 * all: the API accepted a deliveryDate of "banana", of "   ", and of
 * 1900-01-01, and a time slot of arbitrary prose. Those orders reached the
 * admin table, the courier's screen and the Telegram notification exactly as
 * typed, and nothing downstream could make sense of them.
 *
 * The date must be a real calendar date — the regex alone would pass
 * 2026-02-31 — no earlier than today and no further out than a season, since a
 * delivery slot booked a year ahead is a mistake, not a request.
 */
export const MAX_DAYS_AHEAD = 90;
export const MAX_QTY_PER_LINE = 100;

const deliveryDate = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD ko\'rinishida bo\'lishi kerak')
    .refine((v) => {
        const d = new Date(v + 'T00:00:00Z');
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, 'Bunday sana mavjud emas')
    .refine((v) => v >= new Date().toISOString().slice(0, 10),
        'Yetkazish sanasi o\'tmishda bo\'lishi mumkin emas')
    .refine((v) => v <= new Date(Date.now() + MAX_DAYS_AHEAD * 86400000).toISOString().slice(0, 10),
        `Yetkazish sanasi ${MAX_DAYS_AHEAD} kundan uzoq bo'lishi mumkin emas`);

// Shape rather than a fixed list, so the slots offered at checkout can change
// without a server release. Both dash characters are accepted because the web
// client writes an en dash and hand-built requests tend to use a hyphen.
const deliveryTimeSlot = z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d\s*[–-]\s*([01]\d|2[0-3]):[0-5]\d$/,
        'Yetkazish vaqti "09:00–11:00" ko\'rinishida bo\'lishi kerak');

export const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        // A per-line ceiling. Anything past this is a wholesale enquiry that
        // should reach a person, not a quantity someone meant to type into a
        // web basket — the API used to accept an order for 999999 bottles.
        qty: z.number().int().positive().max(MAX_QTY_PER_LINE,
            `Bitta mahsulotdan ko'pi bilan ${MAX_QTY_PER_LINE} dona buyurtma qilish mumkin`),
    })).min(1).max(20, 'Buyurtmada 20 tadan ortiq tur mahsulot bo\'lishi mumkin emas'),
    addressSnapshot: z.object({
        region: z.string().min(1),
        city: z.string().min(1),
        district: z.string().min(1),
        street: z.string().min(1),
        house: z.string().min(1),
        apartment: z.string().optional(),
    }),
    deliveryDate,
    deliveryTimeSlot,
    paymentMethod: z.enum(['cash', 'click', 'payme']),
});

export type OrderInput = z.infer<typeof orderSchema>;

export type CreateOrderResult =
    | { ok: true; order: any }
    | { ok: false; status: number; message: string; errors?: unknown };

/**
 * Google Sheets and Telegram are best-effort side channels. Awaiting them
 * inline made the customer wait on two third-party round trips before their
 * order was confirmed, and an outage at either one surfaced as a failed
 * checkout.
 */
function dispatchOrderSideEffects(order: any, phone: string, name: string): void {
    void GoogleSheetsService.syncOrder(order, phone, name)
        .catch((err) => console.error('[Order] Sheets sync failed:', err?.message || err));

    void TelegramBotService.sendOrderNotification(order, phone, name)
        .catch((err) => console.error('[Order] Telegram notification failed:', err?.message || err));
}

export async function createOrder(
    userId: mongoose.Types.ObjectId | string,
    input: unknown,
    customer: { phone?: string; name?: string } = {},
): Promise<CreateOrderResult> {
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            status: 400,
            message: parsed.error.errors[0]?.message || 'Ma\'lumotlar noto\'g\'ri',
            errors: parsed.error.errors,
        };
    }

    const { items, addressSnapshot, deliveryDate, deliveryTimeSlot, paymentMethod } = parsed.data;

    // Prices come from the database, never from the request: a client that
    // sends its own price would otherwise set what it pays.
    const resolvedItems = [];
    for (const item of items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
            return { ok: false, status: 400, message: 'Mahsulot identifikatori noto\'g\'ri' };
        }

        const product = await Product.findById(item.productId);
        if (!product) {
            return { ok: false, status: 404, message: `Mahsulot topilmadi: ${item.productId}` };
        }
        if (!product.inStock) {
            return { ok: false, status: 400, message: `"${product.name}" hozircha sotuvda yo'q` };
        }

        resolvedItems.push({
            productId: new mongoose.Types.ObjectId(item.productId),
            nameSnapshot: product.name,
            priceSnapshot: product.price,
            qty: item.qty,
        });
    }

    const order = await Order.create({
        userId,
        items: resolvedItems,
        addressSnapshot,
        deliveryDate,
        deliveryTimeSlot,
        paymentMethod,
        status: 'pending',
    });

    dispatchOrderSideEffects(order, customer.phone || '', customer.name || '');

    return { ok: true, order };
}

/** Total of an order's line items, from the prices captured at purchase. */
export const orderTotal = (order: any): number =>
    (order?.items || []).reduce(
        (sum: number, i: any) => sum + (i.priceSnapshot || 0) * (i.qty || 0),
        0,
    );

import mongoose from 'mongoose';
import { z } from 'zod';
import Order from '../models/Order';
import Product from '../models/Product';
import { GoogleSheetsService } from './GoogleSheetsService';
import { TelegramBotService } from './TelegramBotService';
import { DeliveryService } from './DeliveryService';

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
        /**
         * Whether the container comes back. Defaults to true because that is
         * the cheaper option, and a customer who never chose should not be
         * charged the higher price by omission.
         */
        returnBottle: z.boolean().optional().default(true),
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

    /*
     * Stock is claimed with a conditional update rather than a read followed by
     * a write. Two customers ordering the last bottle at the same moment both
     * pass a `stockQty >= qty` check made a moment earlier; only one of them can
     * win a `findOneAndUpdate` that carries the same condition in its filter.
     *
     * Claims are remembered so that a later failure in the same order can put
     * them back — otherwise a rejected delivery region would quietly consume
     * stock nobody bought.
     */
    const claimed: { productId: mongoose.Types.ObjectId; qty: number }[] = [];
    /** Containers this basket hands over and expects back. */
    let bottlesIssued = 0;

    const releaseClaims = async () => {
        for (const c of claimed) {
            await Product.updateOne({ _id: c.productId }, { $inc: { stockQty: c.qty } });
        }
    };

    const fail = async (status: number, message: string): Promise<CreateOrderResult> => {
        await releaseClaims();
        return { ok: false, status, message };
    };

    // Prices come from the database, never from the request: a client that
    // sends its own price would otherwise set what it pays.
    const resolvedItems = [];
    for (const item of items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
            return fail(400, 'Mahsulot identifikatori noto\'g\'ri');
        }

        const product = await Product.findById(item.productId);
        if (!product) return fail(404, `Mahsulot topilmadi: ${item.productId}`);
        if (!product.inStock) return fail(400, `"${product.name}" hozircha sotuvda yo\'q`);

        // A null stockQty means this product is not counted — services, and
        // anything made to order.
        if (product.stockQty !== null && product.stockQty !== undefined) {
            const won = await Product.findOneAndUpdate(
                { _id: product._id, stockQty: { $gte: item.qty } },
                { $inc: { stockQty: -item.qty } },
                { new: true },
            );

            if (!won) {
                return fail(400,
                    `"${product.name}" uchun omborda faqat ${product.stockQty} dona qoldi`);
            }

            claimed.push({ productId: product._id as any, qty: item.qty });

            // Selling the last unit takes it off the shelf, so the catalogue
            // stops offering something the depot cannot supply.
            if ((won.stockQty ?? 0) === 0) {
                await Product.updateOne({ _id: product._id }, { $set: { inStock: false } });
            }
        }

        /*
         * The container charge is applied only where it means something: a
         * returnable product whose container the customer is keeping, and only
         * when a deposit price has been set. Everything else carries zero, so a
         * dispenser or a service can never pick up a bottle charge.
         *
         * Priced from the database like every other figure — a client that sent
         * its own deposit would otherwise decide what it pays for the bottle.
         */
        const keepsContainer = product.returnable && item.returnBottle === false;
        const deposit = keepsContainer ? Number(product.depositPrice || 0) : 0;

        if (keepsContainer && !product.depositPrice) {
            return fail(400,
                `"${product.name}" uchun idish narxi belgilanmagan — idishni qaytarish shart`);
        }

        // What this order puts on the customer's ledger, decided here and
        // stored on the order. Re-deriving it at delivery read the product's
        // CURRENT `returnable` flag, so unticking that flag later silently
        // rewrote what old orders had handed over.
        if (product.returnable && !keepsContainer) bottlesIssued += item.qty;

        resolvedItems.push({
            productId: new mongoose.Types.ObjectId(item.productId),
            nameSnapshot: product.name,
            priceSnapshot: product.price,
            qty: item.qty,
            returnBottle: !keepsContainer,
            depositSnapshot: deposit,
        });
    }

    // Delivery is priced and checked after the basket is known, because the
    // minimum order for a zone is measured against the goods, not the total.
    const itemsTotal = resolvedItems.reduce(
        (sum, i) => sum + (i.priceSnapshot + i.depositSnapshot) * i.qty, 0);
    const quote = await DeliveryService.quote(addressSnapshot.region, itemsTotal);
    if (!quote.ok) return fail(400, quote.message);

    const order = await Order.create({
        userId,
        items: resolvedItems,
        addressSnapshot,
        deliveryDate,
        deliveryTimeSlot,
        paymentMethod,
        deliveryFee: quote.fee,
        bottlesIssued,
        status: 'pending',
    });

    dispatchOrderSideEffects(order, customer.phone || '', customer.name || '');

    return { ok: true, order };
}

/**
 * Puts stock back when an order is called off.
 *
 * Guarded by the order's own status so a double cancellation — an admin and the
 * customer at the same moment, or a retried request — cannot credit the depot
 * twice with bottles it never got back.
 */
export async function releaseStockFor(order: any): Promise<void> {
    for (const item of order?.items || []) {
        /*
         * Availability is only restored for a product that sold out because of
         * stock. Setting inStock unconditionally put a product the owner had
         * deliberately withdrawn back on sale the moment any order touching it
         * was cancelled — the shop would start selling something it had chosen
         * to stop selling.
         */
        await Product.updateOne(
            { _id: item.productId, stockQty: { $ne: null } },
            { $inc: { stockQty: item.qty } },
        );
        await Product.updateOne(
            { _id: item.productId, stockQty: { $gt: 0 }, inStock: false, stockCountedAt: null },
            { $set: { inStock: true } },
        );
    }
}

/** Goods and any container charge, from the prices captured at purchase. */
export const itemsTotal = (order: any): number =>
    (order?.items || []).reduce(
        (sum: number, i: any) =>
            sum + ((i.priceSnapshot || 0) + (i.depositSnapshot || 0)) * (i.qty || 0),
        0,
    );

/** What the customer actually pays: goods plus the delivery charge. */
export const orderTotal = (order: any): number =>
    itemsTotal(order) + (order?.deliveryFee || 0);

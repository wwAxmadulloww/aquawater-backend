import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { TelegramBotService } from '../services/TelegramBotService';

/**
 * Google Sheets and Telegram are best-effort side channels. Awaiting them inline
 * made the customer wait on two third-party round trips before their order was
 * confirmed, and an outage at either one surfaced as a failed checkout.
 */
function dispatchOrderSideEffects(order: any, phone: string, name: string): void {
    void GoogleSheetsService.syncOrder(order, phone, name)
        .catch((err) => console.error('[Order] Sheets sync failed:', err?.message || err));

    void TelegramBotService.sendOrderNotification(order, phone, name)
        .catch((err) => console.error('[Order] Telegram notification failed:', err?.message || err));
}

/*
 * Delivery fields used to be `z.string().min(1)`, which is no validation at
 * all: the API accepted a deliveryDate of "banana", of "   ", and of
 * 1900-01-01, and a time slot of arbitrary prose. Those orders reached the
 * admin table, the courier's screen and the Telegram notification exactly as
 * typed, and nothing downstream could make sense of them.
 *
 * The date must be a real calendar date — the regex alone would pass
 * 2026-02-31 — no earlier than today and no further out than a season, since a
 * delivery slot booked a year ahead is a mistake, not a request.
 */
const MAX_DAYS_AHEAD = 90;

const deliveryDate = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD ko\'rinishida bo\'lishi kerak')
    .refine((v) => {
        const d = new Date(v + 'T00:00:00Z');
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, 'Bunday sana mavjud emas')
    .refine((v) => {
        const today = new Date().toISOString().slice(0, 10);
        return v >= today;
    }, 'Yetkazish sanasi o\'tmishda bo\'lishi mumkin emas')
    .refine((v) => {
        const limit = new Date(Date.now() + MAX_DAYS_AHEAD * 86400000).toISOString().slice(0, 10);
        return v <= limit;
    }, `Yetkazish sanasi ${MAX_DAYS_AHEAD} kundan uzoq bo\'lishi mumkin emas`);

// Shape rather than a fixed list, so the slots offered at checkout can change
// without a server release. Both dash characters are accepted because the web
// client writes an en dash and hand-built requests tend to use a hyphen.
const deliveryTimeSlot = z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d\s*[–-]\s*([01]\d|2[0-3]):[0-5]\d$/,
        'Yetkazish vaqti "09:00–11:00" ko\'rinishida bo\'lishi kerak');

// A per-line ceiling. Anything past this is a wholesale enquiry that should
// reach a person, not a quantity someone meant to type into a web basket.
const MAX_QTY_PER_LINE = 100;

export const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
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

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = orderSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { items, addressSnapshot, deliveryDate, deliveryTimeSlot, paymentMethod } = parsed.data;

        const resolvedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                res.status(404).json({ message: `Product ${item.productId} not found` });
                return;
            }
            if (!product.inStock) {
                res.status(400).json({ message: `Product "${product.name}" is out of stock` });
                return;
            }
            resolvedItems.push({
                productId: new mongoose.Types.ObjectId(item.productId),
                nameSnapshot: product.name,
                priceSnapshot: product.price,
                qty: item.qty,
            });
        }

        const order = await Order.create({
            userId: req.user!._id,
            items: resolvedItems,
            addressSnapshot,
            deliveryDate,
            deliveryTimeSlot,
            paymentMethod,
            status: 'pending',
        });

        dispatchOrderSideEffects(order, req.user?.phone || '', req.user?.name || '');

        res.status(201).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let filter: Record<string, unknown> = {};

        if (req.user!.role === 'admin' || req.user!.role === 'super_admin') {
            filter = {};
        } else if (req.user!.role === 'courier') {
            filter = { courierId: req.user!._id };
        } else if (req.user!.role === 'worker') {
            filter = { workerId: req.user!._id };
        } else {
            filter = { userId: req.user!._id };
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .populate('userId', 'name phone');
        res.json(orders);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid order id' });
            return;
        }

        const order = await Order.findById(req.params.id).populate('userId', 'name phone');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // `userId` is populated into a document here, so `.toString()` yields
        // "[object Object]" and never matched — every customer got 403 on their
        // own order. Read the populated document's _id instead.
        const ownerId = (order.userId as any)?._id ?? order.userId;
        const isOwner = String(ownerId) === String(req.user!._id);

        const isStaff = ['admin', 'super_admin'].includes(req.user!.role)
            || (req.user!.role === 'courier' && String(order.courierId ?? '') === String(req.user!._id))
            || (req.user!.role === 'worker' && String(order.workerId ?? '') === String(req.user!._id));

        if (!isOwner && !isStaff) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        res.json(order);
    } catch (err) {
        console.error('[Order] getOrderById error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid order id' });
            return;
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
        const isCourier = req.user!.role === 'courier';
        const isAssignedCourier = order.courierId?.toString() === req.user!._id.toString();

        if (isAdmin) {
            order.status = status;
        } else if (isCourier && isAssignedCourier) {
            if (status === 'delivered' || status === 'in_transit') {
                if (status === 'delivered' && !['assigned', 'in_transit'].includes(order.status)) {
                    res.status(400).json({ message: 'Order must be assigned or in transit to be marked as delivered' });
                    return;
                }
                if (status === 'in_transit' && !['confirmed', 'assigned'].includes(order.status)) {
                    res.status(400).json({ message: 'Order must be confirmed or assigned before it can be in transit' });
                    return;
                }
                order.status = status;
            } else {
                res.status(403).json({ message: 'Couriers can only update to in_transit or delivered' });
                return;
            }
        } else {
            res.status(403).json({ message: 'Permission denied' });
            return;
        }

        await order.save();

        // Keep the Telegram group in sync with dashboard-driven changes.
        void TelegramBotService.sendStatusUpdateNotification(order, req.user?.name || req.user!.role)
            .catch((err) => console.error('[Order] Telegram status notification failed:', err?.message || err));

        res.json(order);
    } catch (err) {
        console.error('[Order] updateOrderStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid order id' });
            return;
        }

        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json({ message: 'Order deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const assignOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid order id' });
            return;
        }

        const { courierId, workerId } = req.body;
        const update: Record<string, unknown> = {};

        // A malformed id previously threw a CastError and surfaced as a generic 500.
        for (const [field, value] of [['courierId', courierId], ['workerId', workerId]] as const) {
            if (value === undefined) continue;
            if (value && !mongoose.Types.ObjectId.isValid(value)) {
                res.status(400).json({ message: `Invalid ${field}` });
                return;
            }
            update[field] = value || null;
        }

        if (Object.keys(update).length === 0) {
            res.status(400).json({ message: 'Nothing to assign' });
            return;
        }

        // Assigning someone makes the order actionable for them.
        if (update.courierId) update.status = 'assigned';

        const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json(order);
    } catch (err) {
        console.error('[Order] assignOrder error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

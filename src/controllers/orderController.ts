import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { createOrder as createOrderForUser, orderSchema, releaseStockFor } from '../services/OrderService';
import { BottleService } from '../services/BottleService';
import { TelegramBotService } from '../services/TelegramBotService';
import { pageParams, paged } from '../lib/pagination';

// Re-exported because the validation schema is part of this module's public
// surface for callers that only import the controller.
export { orderSchema };

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await createOrderForUser(req.user!._id, req.body, {
            phone: req.user?.phone,
            name: req.user?.name,
        });

        if (!result.ok) {
            res.status(result.status).json(
                result.errors ? { errors: result.errors } : { message: result.message },
            );
            return;
        }

        res.status(201).json(result.order);
    } catch (err) {
        console.error('[Order] create failed:', err);
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
        } else {
            filter = { userId: req.user!._id };
        }

        /*
         * Only a known status, and only as a string. Express parses
         * `?status[$ne]=x` into an object, which would have been handed straight
         * to Mongo as a query operator rather than compared as a value.
         */
        const ALLOWED = ['pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled'];
        if (typeof req.query.status === 'string' && ALLOWED.includes(req.query.status)) {
            filter.status = req.query.status;
        }

        /*
         * The container balance rides along so the courier at the door knows
         * how many empties to expect. Without it they were typing a number
         * blind, and a wrong count is what makes the whole ledger untrustworthy.
         */
        const p = pageParams(req);
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(p.skip)
                .limit(p.limit)
                .populate('userId', 'name phone bottleBalance'),
            Order.countDocuments(filter),
        ]);
        res.json(paged(orders, total, p));
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

        const order = await Order.findById(req.params.id).populate('userId', 'name phone bottleBalance');
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
            || (req.user!.role === 'courier' && String(order.courierId ?? '') === String(req.user!._id));

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

        const previousStatus = order.status;
        const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
        const isCourier = req.user!.role === 'courier';
        const isAssignedCourier = order.courierId?.toString() === req.user!._id.toString();

        if (isAdmin) {
            order.status = status;
        } else if (isCourier && isAssignedCourier) {
            if (status === 'delivered' || status === 'in_transit') {
                /*
                 * `confirmed` counts. The courier is already known to be the one
                 * assigned to this order, so the only thing this guard has to
                 * stop is delivering something nobody was sent to deliver. An
                 * admin confirming an order after assigning it used to leave the
                 * courier standing at the door unable to close it — and the
                 * empties on that stop were then never recorded.
                 */
                if (status === 'delivered' && !['assigned', 'confirmed', 'in_transit'].includes(order.status)) {
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

        /*
         * A courier reports the empties they took back at the same moment they
         * mark the order delivered — it is the only moment they have the
         * information, and asking them to do it on a second screen means it
         * never gets done.
         */
        if (status === 'delivered' && req.body.emptiesCollected !== undefined) {
            const empties = Number(req.body.emptiesCollected);
            if (!Number.isInteger(empties) || empties < 0 || empties > 200) {
                res.status(400).json({ message: 'Qaytarilgan idish soni noto\'g\'ri' });
                return;
            }
            order.emptiesCollected = empties;
        }

        /*
         * Money is recorded at the door, by the person who took it.
         *
         * Cash is assumed paid on delivery because that is what happens, but the
         * courier can say otherwise — a customer who was short, or asked to be
         * billed — and the order then stays a debt instead of quietly becoming
         * revenue. Card methods have no gateway behind them yet, so they are
         * never marked paid here; somebody has to confirm the money arrived.
         */
        if (status === 'delivered' && previousStatus !== 'delivered') {
            const saidPaid = req.body.paid;
            const collected = order.paymentMethod === 'cash'
                ? saidPaid !== false
                : saidPaid === true;

            if (collected) {
                order.paymentStatus = 'paid';
                order.paidAt = new Date();
                order.cashCollectedBy = req.user!._id as any;
            }
        }

        await order.save();

        /*
         * Containers move on delivery, not on order: an order that is cancelled
         * never left the depot. Cancelling frees the stock it had claimed, so a
         * called-off order does not keep bottles off the shelf.
         */
        if (status === 'delivered' && previousStatus !== 'delivered') {
            await BottleService.settleDelivery(order, String(req.user!._id))
                .catch((err: any) => console.error('[Order] Bottle ledger failed:', err?.message || err));
        }
        if (status === 'cancelled' && previousStatus !== 'cancelled') {
            await releaseStockFor(order)
                .catch((err: any) => console.error('[Order] Stock release failed:', err?.message || err));
        }

        // Keep the Telegram group in sync with dashboard-driven changes.
        void TelegramBotService.sendStatusUpdateNotification(order, req.user?.name || req.user!.role)
            .catch((err: any) => console.error('[Order] Telegram status notification failed:', err?.message || err));

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

        /*
         * Deleting an order has to return its stock, exactly as cancelling does.
         * Without this the units it claimed were gone for good: the shelf count
         * fell every time an operator tidied up an old order, and the shop
         * eventually refused sales for stock it actually had.
         *
         * Only for orders that had not been delivered — a delivered order's
         * goods really did leave the depot.
         */
        if (order.status !== 'delivered') {
            await releaseStockFor(order)
                .catch((err: any) => console.error('[Order] Stock release on delete failed:', err?.message || err));
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

        const { courierId } = req.body;

        // A malformed id previously threw a CastError and surfaced as a generic 500.
        if (courierId === undefined) {
            res.status(400).json({ message: 'Nothing to assign' });
            return;
        }
        if (courierId && !mongoose.Types.ObjectId.isValid(courierId)) {
            res.status(400).json({ message: 'Invalid courierId' });
            return;
        }

        const update: Record<string, unknown> = { courierId: courierId || null };

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


/**
 * Records that a courier's collected cash has reached the office.
 *
 * This is the other half of the chain of custody: without it the shop knows a
 * customer paid but not whether the money was ever handed in, which is the
 * gap a cash business actually loses money through.
 */
export const settleCash = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { courierId, orderIds } = req.body;

        const filter: Record<string, unknown> = {
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            cashSettledAt: null,
        };

        if (courierId) {
            if (!mongoose.Types.ObjectId.isValid(courierId)) {
                res.status(400).json({ message: 'Invalid courierId' });
                return;
            }
            filter.cashCollectedBy = courierId;
        }
        if (Array.isArray(orderIds) && orderIds.length > 0) {
            if (!orderIds.every((id: string) => mongoose.Types.ObjectId.isValid(id))) {
                res.status(400).json({ message: 'Invalid orderIds' });
                return;
            }
            filter._id = { $in: orderIds };
        }
        if (!courierId && !Array.isArray(orderIds)) {
            res.status(400).json({ message: 'Kuryer yoki buyurtmalar ko\'rsatilmagan' });
            return;
        }

        const result = await Order.updateMany(filter, {
            $set: { cashSettledAt: new Date(), cashSettledBy: req.user!._id },
        });

        res.json({ settled: result.modifiedCount });
    } catch (err) {
        console.error('[Order] settleCash error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Lets a customer call off their own order while it is still callable off.
 *
 * Once a courier is on the road it is too late to do this without a phone call,
 * so it stops at `confirmed`. Every cancellation used to be a phone call — the
 * shop had no way for a customer to undo their own mistake.
 */
export const cancelOwnOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid order id' });
            return;
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        if (String(order.userId) !== String(req.user!._id)) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        if (!['pending', 'confirmed'].includes(order.status)) {
            res.status(400).json({
                message: 'Buyurtma yo\'lga chiqqan — bekor qilish uchun operatorga murojaat qiling',
            });
            return;
        }

        order.status = 'cancelled';
        await order.save();

        // The stock it was holding goes back on the shelf.
        await releaseStockFor(order);

        res.json(order);
    } catch (err) {
        console.error('[Order] cancelOwnOrder error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

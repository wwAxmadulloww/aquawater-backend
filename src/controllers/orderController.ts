import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { createOrder as createOrderForUser, orderSchema, releaseStockFor } from '../services/OrderService';
import { BottleService } from '../services/BottleService';
import { TelegramBotService } from '../services/TelegramBotService';

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

        const previousStatus = order.status;
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

import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { TelegramBotService } from '../services/TelegramBotService';

export const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        qty: z.number().int().positive(),
    })).min(1),
    addressSnapshot: z.object({
        region: z.string().min(1),
        city: z.string().min(1),
        district: z.string().min(1),
        street: z.string().min(1),
        house: z.string().min(1),
        apartment: z.string().optional(),
    }),
    deliveryDate: z.string().min(1),
    deliveryTimeSlot: z.string().min(1),
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

        await GoogleSheetsService.syncOrder(order, req.user?.phone || '', req.user?.name || '');
        await TelegramBotService.sendOrderNotification(order, req.user?.phone || '', req.user?.name || '');

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
        const order = await Order.findById(req.params.id).populate('userId', 'name phone');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const isOwner = order.userId.toString() === req.user!._id.toString();
        if (!isOwner && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        res.json(order);
    } catch {
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
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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
        const { courierId, workerId } = req.body;
        const update: Record<string, unknown> = {};
        if (courierId !== undefined) update.courierId = courierId || null;
        if (workerId !== undefined) update.workerId = workerId || null;

        const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json(order);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

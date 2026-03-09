import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { auth, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/role';

const router = Router();

const orderSchema = z.object({
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

// POST /api/orders
router.post('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = orderSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const { items, addressSnapshot, deliveryDate, deliveryTimeSlot, paymentMethod } = parsed.data;

        // Resolve products and build snapshots
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

        res.status(201).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/orders
router.get('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let filter: Record<string, unknown> = {};

        if (req.user!.role === 'admin') {
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
});

// GET /api/orders/:id
router.get('/:id', auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const order = await Order.findById(req.params.id).populate('userId', 'name phone');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const isOwner = order.userId.toString() === req.user!._id.toString();
        if (!isOwner && req.user!.role !== 'admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        res.json(order);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/orders/:id/status (admin)
router.patch('/:id/status', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        if (!['pending', 'accepted', 'delivered'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json(order);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/orders/:id (admin only)
router.delete('/:id', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
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
});

// PATCH /api/orders/:id/assign (admin only)
router.patch('/:id/assign', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
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
});

export default router;


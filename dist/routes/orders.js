"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
const orderSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string(),
        qty: zod_1.z.number().int().positive(),
    })).min(1),
    addressSnapshot: zod_1.z.object({
        region: zod_1.z.string().min(1),
        city: zod_1.z.string().min(1),
        district: zod_1.z.string().min(1),
        street: zod_1.z.string().min(1),
        house: zod_1.z.string().min(1),
        apartment: zod_1.z.string().optional(),
    }),
    deliveryDate: zod_1.z.string().min(1),
    deliveryTimeSlot: zod_1.z.string().min(1),
    paymentMethod: zod_1.z.enum(['cash', 'click', 'payme']),
});
// POST /api/orders
router.post('/', auth_1.auth, async (req, res) => {
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
            const product = await Product_1.default.findById(item.productId);
            if (!product) {
                res.status(404).json({ message: `Product ${item.productId} not found` });
                return;
            }
            if (!product.inStock) {
                res.status(400).json({ message: `Product "${product.name}" is out of stock` });
                return;
            }
            resolvedItems.push({
                productId: new mongoose_1.default.Types.ObjectId(item.productId),
                nameSnapshot: product.name,
                priceSnapshot: product.price,
                qty: item.qty,
            });
        }
        const order = await Order_1.default.create({
            userId: req.user._id,
            items: resolvedItems,
            addressSnapshot,
            deliveryDate,
            deliveryTimeSlot,
            paymentMethod,
            status: 'pending',
        });
        res.status(201).json(order);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/orders
router.get('/', auth_1.auth, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'admin') {
            filter = {};
        }
        else if (req.user.role === 'courier') {
            filter = { courierId: req.user._id };
        }
        else if (req.user.role === 'worker') {
            filter = { workerId: req.user._id };
        }
        else {
            filter = { userId: req.user._id };
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const orders = await Order_1.default.find(filter)
            .sort({ createdAt: -1 })
            .populate('userId', 'name phone');
        res.json(orders);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/orders/:id
router.get('/:id', auth_1.auth, async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id).populate('userId', 'name phone');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const isOwner = order.userId.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        res.json(order);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// PATCH /api/orders/:id/status
router.patch('/:id/status', auth_1.auth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
        const isCourier = req.user.role === 'courier';
        const isAssignedCourier = order.courierId?.toString() === req.user._id.toString();
        // 1. Admin/SuperAdmin can change any status
        if (isAdmin) {
            order.status = status;
        }
        // 2. Courier can ONLY change status to 'delivered' or 'in_transit' for their own orders
        else if (isCourier && isAssignedCourier) {
            if (status === 'delivered' || status === 'in_transit') {
                // Couriers can only mark as delivered if it was assigned/in_transit
                if (status === 'delivered' && !['assigned', 'in_transit'].includes(order.status)) {
                    res.status(400).json({ message: 'Order must be assigned or in transit to be marked as delivered' });
                    return;
                }
                order.status = status;
            }
            else {
                res.status(403).json({ message: 'Couriers can only update to in_transit or delivered' });
                return;
            }
        }
        else {
            res.status(403).json({ message: 'Permission denied' });
            return;
        }
        await order.save();
        res.json(order);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// DELETE /api/orders/:id (admin only)
router.delete('/:id', auth_1.auth, role_1.adminOnly, async (req, res) => {
    try {
        const order = await Order_1.default.findByIdAndDelete(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json({ message: 'Order deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// PATCH /api/orders/:id/assign (admin only)
router.patch('/:id/assign', auth_1.auth, role_1.adminOnly, async (req, res) => {
    try {
        const { courierId, workerId } = req.body;
        const update = {};
        if (courierId !== undefined)
            update.courierId = courierId || null;
        if (workerId !== undefined)
            update.workerId = workerId || null;
        const order = await Order_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json(order);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;

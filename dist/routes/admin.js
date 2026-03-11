"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
// GET /api/admin/stats
router.get('/stats', auth_1.auth, role_1.adminOnly, async (_req, res) => {
    try {
        const totalOrders = await Order_1.default.countDocuments();
        const deliveredOrders = await Order_1.default.countDocuments({ status: 'delivered' });
        const pendingOrders = await Order_1.default.countDocuments({ status: 'pending' });
        const acceptedOrders = await Order_1.default.countDocuments({ status: 'accepted' });
        const totalCustomers = await User_1.default.countDocuments({ role: 'customer' });
        const totalProducts = await Product_1.default.countDocuments();
        // Revenue calculation
        const revenueResult = await Order_1.default.aggregate([
            { $match: { status: 'delivered' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] },
                    },
                },
            },
        ]);
        const totalRevenue = revenueResult[0]?.totalRevenue || 0;
        // Orders per day (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const ordersPerDay = await Order_1.default.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $reduce: {
                                input: '$items',
                                initialValue: 0,
                                in: { $add: ['$$value', { $multiply: ['$$this.priceSnapshot', '$$this.qty'] }] },
                            },
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        res.json({
            totalOrders,
            deliveredOrders,
            pendingOrders,
            acceptedOrders,
            totalCustomers,
            totalProducts,
            totalRevenue,
            ordersPerDay,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/admin/users
router.get('/users', auth_1.auth, role_1.adminOnly, async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', auth_1.auth, role_1.adminOrSuper, async (req, res) => {
    try {
        const { role, workerType } = req.body;
        const targetId = req.params.id;
        const actor = req.user;
        if (!['customer', 'admin', 'worker', 'courier', 'super_admin'].includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }
        const targetUser = await User_1.default.findById(targetId);
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // HIERARCHY LOGIC
        // 1. Admin cannot promote to admin or super_admin
        if (actor.role === 'admin' && (role === 'admin' || role === 'super_admin')) {
            res.status(403).json({ message: 'Admins cannot create other admins or super admins' });
            return;
        }
        // 2. Admin cannot manage existing admin or super_admin
        if (actor.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
            res.status(403).json({ message: 'Admins cannot modify other admins or super admins' });
            return;
        }
        // 3. Prevent demoting the last super_admin (safety check)
        if (targetUser.role === 'super_admin' && role !== 'super_admin') {
            const superAdminCount = await User_1.default.countDocuments({ role: 'super_admin' });
            if (superAdminCount <= 1) {
                res.status(400).json({ message: 'Cannot demote the last Super Admin' });
                return;
            }
        }
        const updateData = { role };
        if (role === 'worker') {
            updateData.workerType = workerType || '';
        }
        else {
            updateData.$unset = { workerType: 1 };
        }
        const user = await User_1.default.findByIdAndUpdate(targetId, updateData, { new: true }).select('-passwordHash');
        // Audit log
        console.log(`[AUDIT] Role change: User ${targetId} role changed from ${targetUser.role} to ${role} by ${actor.role} ${actor._id}`);
        res.json(user);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// DELETE /api/admin/users/:id
router.delete('/users/:id', auth_1.auth, role_1.superAdminOnly, async (req, res) => {
    try {
        const targetId = req.params.id;
        const targetUser = await User_1.default.findById(targetId);
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Safety: Cannot delete the last super_admin
        if (targetUser.role === 'super_admin') {
            const superAdminCount = await User_1.default.countDocuments({ role: 'super_admin' });
            if (superAdminCount <= 1) {
                res.status(400).json({ message: 'Cannot delete the last Super Admin' });
                return;
            }
        }
        await User_1.default.findByIdAndDelete(targetId);
        console.log(`[AUDIT] User DELETED: User ${targetId} (${targetUser.phone}) deleted by super_admin ${req.user?._id}`);
        res.json({ message: 'User deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;

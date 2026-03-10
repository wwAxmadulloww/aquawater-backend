import { Router, Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Product from '../models/Product';
import { auth, AuthRequest } from '../middleware/auth';
import { adminOnly, adminOrSuper } from '../middleware/role';

const router = Router();

// GET /api/admin/stats
router.get('/stats', auth, adminOnly, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const totalOrders = await Order.countDocuments();
        const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const acceptedOrders = await Order.countDocuments({ status: 'accepted' });
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const totalProducts = await Product.countDocuments();

        // Revenue calculation
        const revenueResult = await Order.aggregate([
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

        const ordersPerDay = await Order.aggregate([
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/users
router.get('/users', auth, adminOnly, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', auth, adminOrSuper, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, workerType } = req.body;
        const targetId = req.params.id;
        const actor = req.user!;

        if (!['customer', 'admin', 'worker', 'courier', 'super_admin'].includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }

        const targetUser = await User.findById(targetId);
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
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount <= 1) {
                res.status(400).json({ message: 'Cannot demote the last Super Admin' });
                return;
            }
        }

        const updateData: any = { role };
        if (role === 'worker') {
            updateData.workerType = workerType || '';
        } else {
            updateData.$unset = { workerType: 1 };
        }

        const user = await User.findByIdAndUpdate(targetId, updateData, { new: true }).select('-passwordHash');

        // Audit log
        console.log(`[AUDIT] Role change: User ${targetId} role changed from ${targetUser.role} to ${role} by ${actor.role} ${actor._id}`);

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

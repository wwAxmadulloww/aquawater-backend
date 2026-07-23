import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import User from '../models/User';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Run the independent counts concurrently rather than in six round trips.
        const [
            totalOrders,
            deliveredOrders,
            pendingOrders,
            // 'accepted' is not in the Order status enum, so this always returned 0.
            // The equivalent real status is 'confirmed'.
            acceptedOrders,
            cancelledOrders,
            totalCustomers,
            totalProducts,
        ] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'confirmed' }),
            Order.countDocuments({ status: 'cancelled' }),
            User.countDocuments({ role: 'customer' }),
            Product.countDocuments(),
        ]);

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
            confirmedOrders: acceptedOrders,
            cancelledOrders,
            totalCustomers,
            totalProducts,
            totalRevenue,
            ordersPerDay,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, workerType } = req.body;
        const targetId = req.params.id;
        const actor = req.user!;

        if (!['customer', 'admin', 'worker', 'courier', 'super_admin'].includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            res.status(400).json({ message: 'Invalid user id' });
            return;
        }

        if (String(targetId) === String(actor._id) && role !== actor.role) {
            res.status(400).json({ message: 'You cannot change your own role' });
            return;
        }

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (actor.role === 'admin' && (role === 'admin' || role === 'super_admin')) {
            res.status(403).json({ message: 'Admins cannot create other admins or super admins' });
            return;
        }

        if (actor.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
            res.status(403).json({ message: 'Admins cannot modify other admins or super admins' });
            return;
        }

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

        console.log(`[AUDIT] Role change: User ${targetId} role changed from ${targetUser.role} to ${role} by ${actor.role} ${actor._id}`);

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const targetId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            res.status(400).json({ message: 'Invalid user id' });
            return;
        }

        if (String(targetId) === String(req.user?._id)) {
            res.status(400).json({ message: 'You cannot delete your own account' });
            return;
        }

        const targetUser = await User.findById(targetId);

        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (targetUser.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount <= 1) {
                res.status(400).json({ message: 'Cannot delete the last Super Admin' });
                return;
            }
        }

        await User.findByIdAndDelete(targetId);

        console.log(`[AUDIT] User DELETED: User ${targetId} (${targetUser.phone}) deleted by super_admin ${req.user?._id}`);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

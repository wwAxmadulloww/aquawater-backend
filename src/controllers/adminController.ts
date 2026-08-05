import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { BottleService } from '../services/BottleService';
import { pageParams, paged } from '../lib/pagination';
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
                        $sum: { $multiply: [
                            { $add: ['$items.priceSnapshot', { $ifNull: ['$items.depositSnapshot', 0] }] },
                            '$items.qty'] },
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
                                in: { $add: ['$$value', { $multiply: [
                                    { $add: ['$$this.priceSnapshot', { $ifNull: ['$$this.depositSnapshot', 0] }] },
                                    '$$this.qty'] }] },
                            },
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Products with a tracked quantity that nobody has physically counted.
        // Those figures came from a seed, not a shelf, and until someone counts
        // them the guard against overselling is running on a guess.
        const uncountedStock = await Product.find({
            stockQty: { $ne: null },
            $or: [{ stockCountedAt: null }, { stockCountedAt: { $exists: false } }],
        }).select('name stockQty').lean();

        res.json({
            uncountedStock,
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

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const p = pageParams(req);
        const [users, total] = await Promise.all([
            User.find().select('-passwordHash').sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
            User.countDocuments(),
        ]);
        res.json(paged(users, total, p));
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role } = req.body;
        const targetId = req.params.id;
        const actor = req.user!;

        if (!['customer', 'admin', 'courier', 'super_admin'].includes(role)) {
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

        // `workerType` went with the fitter role; any left on old documents is
        // cleared as those users are touched.
        const updateData: any = { role, $unset: { workerType: 1 } };

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

        /*
         * Containers are the shop's property. Removing the only record of who
         * has them makes them unrecoverable, so it takes an explicit
         * acknowledgement rather than happening as a side effect of tidying up
         * a user list.
         */
        const owed = await BottleService.balanceFor(targetId);
        if (owed > 0 && req.body?.forgiveBottles !== true) {
            res.status(400).json({
                message: `Bu mijozda ${owed} ta qaytarilmagan idish bor. `
                    + 'O\'chirish uchun idishlar hisobdan chiqarilishini tasdiqlang.',
                bottleBalance: owed,
            });
            return;
        }

        await User.findByIdAndDelete(targetId);

        console.log(`[AUDIT] User DELETED: User ${targetId} (${targetUser.phone}) deleted by super_admin ${req.user?._id}`);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


/**
 * Sets a temporary password for a customer who cannot get in.
 *
 * Self-service recovery needs SMS, which is not wired up yet, so until it is
 * the only route back into an account is the shop doing it — and doing it
 * through an audited endpoint rather than by editing the database. The new
 * password is returned once, to be read out over the phone, and never stored
 * anywhere else.
 */
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const targetId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            res.status(400).json({ message: 'Invalid user id' });
            return;
        }

        const target = await User.findById(targetId);
        if (!target) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Staff accounts are not reset over the phone; that is how an operator
        // talks their way into an administrator.
        if (target.role !== 'customer') {
            res.status(403).json({ message: 'Faqat mijoz parolini tiklash mumkin' });
            return;
        }

        // Ambiguous characters left out: this gets read aloud down a phone line.
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const temporary = Array.from(
            { length: 10 },
            () => alphabet[Math.floor(Math.random() * alphabet.length)],
        ).join('');

        // Hashed with the same cost the registration path uses. The model has
        // no save hook, so this is where it has to happen.
        target.passwordHash = await bcrypt.hash(temporary, 12);
        await target.save();

        console.log(`[AUDIT] Password reset for ${targetId} by ${req.user!.role} ${req.user!._id}`);
        res.json({ temporaryPassword: temporary });
    } catch (err) {
        console.error('[Admin] resetUserPassword error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

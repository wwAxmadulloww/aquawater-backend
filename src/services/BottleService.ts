import mongoose from 'mongoose';
import BottleMovement, { BottleDirection } from '../models/BottleMovement';
import Product from '../models/Product';
import User from '../models/User';

/**
 * The returnable-container ledger.
 *
 * Containers go out when an order is delivered — not when it is placed, since
 * a cancelled order never left the depot — and come back when a courier
 * records the empties they collected. Both are written here so that every
 * change to a customer's balance has a row explaining it.
 */

/** How many returnable containers an order puts into a customer's hands. */
export async function countReturnables(order: any): Promise<number> {
    const items = order?.items || [];
    if (items.length === 0) return 0;

    const ids = items.map((i: any) => i.productId).filter(Boolean);
    if (ids.length === 0) return 0;

    const products = await Product.find({ _id: { $in: ids }, returnable: true })
        .select('_id')
        .lean();

    const returnable = new Set(products.map((p: any) => String(p._id)));
    return items.reduce(
        (sum: number, i: any) => sum + (returnable.has(String(i.productId)) ? (i.qty || 0) : 0),
        0,
    );
}

/**
 * Records a movement and keeps the cached balance in step.
 *
 * A duplicate order-linked movement (same order, same direction) is swallowed
 * rather than treated as an error: delivery notifications get retried and
 * couriers double-tap, and counting one delivery twice would leave a customer
 * apparently owing bottles they never received. The unique index is what makes
 * this safe under concurrency, rather than a read-then-write check.
 *
 * A manual adjustment carries no order, so it has nothing to be a duplicate of
 * and any collision there is a genuine fault that must surface.
 */
export async function record(opts: {
    userId: mongoose.Types.ObjectId | string;
    delta: number;
    direction: BottleDirection;
    orderId?: mongoose.Types.ObjectId | string;
    recordedBy?: mongoose.Types.ObjectId | string;
    note?: string;
}): Promise<boolean> {
    if (!opts.delta) return false;

    try {
        await BottleMovement.create({
            userId: opts.userId,
            orderId: opts.orderId,
            delta: opts.delta,
            direction: opts.direction,
            recordedBy: opts.recordedBy,
            note: opts.note,
        });
    } catch (err: any) {
        if (err?.code === 11000 && opts.orderId) {
            console.log('[Bottles] Movement already recorded for this order; ignoring.');
            return false;
        }
        // A manual adjustment has no order to be a duplicate of, so a collision
        // here is a real fault and must reach the caller rather than look like
        // a correction that silently did nothing.
        throw err;
    }

    await User.updateOne({ _id: opts.userId }, { $inc: { bottleBalance: opts.delta } });
    return true;
}

/** Called when an order reaches `delivered`. Issues out, collects empties back. */
export async function settleDelivery(order: any, recordedBy?: string): Promise<void> {
    const issued = await countReturnables(order);
    if (issued > 0) {
        await record({
            userId: order.userId,
            orderId: order._id,
            delta: issued,
            direction: 'issued',
            recordedBy,
            note: 'Yetkazib berildi',
        });
    }

    const collected = Number(order.emptiesCollected || 0);
    if (collected > 0) {
        await record({
            userId: order.userId,
            orderId: order._id,
            delta: -collected,
            direction: 'returned',
            recordedBy,
            note: 'Bo\'sh idish qaytarildi',
        });
    }
}

/** A customer's balance and their recent movements, for the bot and the site. */
export async function statementFor(userId: mongoose.Types.ObjectId | string, limit = 10) {
    const [user, movements] = await Promise.all([
        User.findById(userId).select('bottleBalance').lean(),
        BottleMovement.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    return {
        balance: (user as any)?.bottleBalance ?? 0,
        movements,
    };
}

/**
 * Everyone currently holding containers, worst first.
 *
 * Reads the ledger rather than the cached column, because this is the report
 * the owner chases people with and it must not be able to disagree with the
 * rows behind it.
 */
export async function outstandingHolders(limit = 100) {
    return BottleMovement.aggregate([
        { $group: { _id: '$userId', balance: { $sum: '$delta' }, lastMovement: { $max: '$createdAt' } } },
        { $match: { balance: { $gt: 0 } } },
        { $sort: { balance: -1 } },
        { $limit: limit },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
            $project: {
                _id: 1, balance: 1, lastMovement: 1,
                name: '$user.name', phone: '$user.phone',
            },
        },
    ]);
}

/**
 * Depot-wide totals, for the admin dashboard.
 *
 * `outstanding` is the sum of the POSITIVE balances, not issued minus returned.
 * Those two differ whenever a customer has handed back more than they were
 * issued — a stocktake correction, or empties dropped off from before the
 * ledger existed — and the netted figure then quietly cancels somebody else's
 * real debt. The screen showed 2 outstanding while the chase list beneath it
 * named two customers holding two each.
 */
export async function depotSummary() {
    const [agg] = await BottleMovement.aggregate([
        {
            $group: {
                _id: null,
                issued: { $sum: { $cond: [{ $gt: ['$delta', 0] }, '$delta', 0] } },
                returned: { $sum: { $cond: [{ $lt: ['$delta', 0] }, { $abs: '$delta' }, 0] } },
            },
        },
    ]);

    const [net] = await BottleMovement.aggregate([
        { $group: { _id: '$userId', balance: { $sum: '$delta' } } },
        { $match: { balance: { $gt: 0 } } },
        { $group: { _id: null, outstanding: { $sum: '$balance' } } },
    ]);

    return {
        issued: agg?.issued ?? 0,
        returned: agg?.returned ?? 0,
        outstanding: net?.outstanding ?? 0,
    };
}

export const BottleService = {
    countReturnables, record, settleDelivery, statementFor, outstandingHolders, depotSummary,
};

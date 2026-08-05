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

    /*
     * Only lines the customer agreed to return count. A line bought outright —
     * the container paid for and kept — must never land on their ledger, or the
     * business would chase them for a bottle they own.
     *
     * Orders placed before the choice existed have no `returnBottle` field;
     * those are treated as returnable, which is what they were sold as.
     */
    return items.reduce(
        (sum: number, i: any) => sum + (
            returnable.has(String(i.productId)) && i.returnBottle !== false
                ? (i.qty || 0)
                : 0
        ),
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
    /*
     * The figure decided when the order was placed wins. Counting the items
     * again here asked the products what they are *today*, so a product the
     * owner stopped treating as returnable changed what an order delivered
     * weeks earlier had put into the customer's hands. Orders from before the
     * snapshot existed still fall back to counting.
     */
    const issued = typeof order?.bottlesIssued === 'number'
        ? order.bottlesIssued
        : await countReturnables(order);
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

/**
 * A customer's balance and their recent movements, for the bot and the site.
 *
 * The figure is summed from the ledger, not read from the cached column.
 * `record()` writes the row and then increments the cache as a second
 * operation, so anything that interrupts it between the two — a dropped
 * connection, a deleted user — leaves the two disagreeing. That mattered:
 * the chase list reads the ledger and this reads the cache, so a customer
 * could be shown nothing owed while the shop was chasing them for three,
 * and could close their account on the strength of it.
 *
 * The cache stays for list screens, where one number per row is worth more
 * than exactness; anywhere a decision is made, the rows decide.
 */
export async function statementFor(userId: mongoose.Types.ObjectId | string, limit = 10) {
    const [totals, movements] = await Promise.all([
        BottleMovement.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
            { $group: { _id: null, balance: { $sum: '$delta' } } },
        ]),
        BottleMovement.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    return {
        balance: totals[0]?.balance ?? 0,
        movements,
    };
}

/** The ledger's own answer for one customer, for decisions that must be right. */
export async function balanceFor(userId: mongoose.Types.ObjectId | string): Promise<number> {
    const [row] = await BottleMovement.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
        { $group: { _id: null, balance: { $sum: '$delta' } } },
    ]);
    return row?.balance ?? 0;
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
        /*
         * A plain $unwind drops holders whose account no longer exists, and the
         * depot summary counts them regardless — so deleting a customer who was
         * holding four bottles left the dashboard saying four are out with
         * nobody named against them. The bottles are physically still out; the
         * list has to say so.
         */
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1, balance: 1, lastMovement: 1,
                name: { $ifNull: ['$user.name', "O'chirilgan mijoz"] },
                phone: { $ifNull: ['$user.phone', null] },
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
    countReturnables, record, settleDelivery, statementFor, balanceFor,
    outstandingHolders, depotSummary,
};

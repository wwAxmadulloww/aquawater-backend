import Order from '../models/Order';

/**
 * The numbers the owner needs to run the business, rather than the single
 * lifetime revenue figure the dashboard used to show.
 *
 * Revenue counts money that was actually taken, not deliveries that happened.
 * Those were the same figure, which for a cash business is the one assumption
 * that must never be made: a courier could mark a stop done, keep the notes,
 * and the day still reported the sale as income. `paid` is now what counts, and
 * what has been collected but not yet handed in is reported separately — that
 * figure is the cash currently in couriers' pockets.
 */

const PAID = 'paid';

export interface Range {
    from?: string;
    to?: string;
}

/**
 * Uzbekistan is UTC+5, and the day boundaries have to be the ones on the wall.
 *
 * The range was built in UTC, so "today" actually ran from 05:00 today to
 * 05:00 tomorrow local: every order taken between midnight and five in the
 * morning landed in the previous day's takings, and no daily figure could be
 * reconciled against a till.
 */
const TZ_OFFSET_HOURS = 5;

const startOfLocalDay = (day: string) =>
    new Date(`${day}T00:00:00.000+0${TZ_OFFSET_HOURS}:00`);
const endOfLocalDay = (day: string) =>
    new Date(`${day}T23:59:59.999+0${TZ_OFFSET_HOURS}:00`);

/**
 * Inclusive of both ends.
 *
 * Dated by `paidAt` — when the money arrived — rather than by when the order
 * was placed. An order taken on the 31st and paid for on the 2nd belongs to
 * February's takings, and dating it by `createdAt` put it in January's.
 */
function match(range: Range) {
    const m: Record<string, any> = { paymentStatus: PAID };
    if (range.from || range.to) {
        m.paidAt = {};
        if (range.from) m.paidAt.$gte = startOfLocalDay(range.from);
        if (range.to) m.paidAt.$lte = endOfLocalDay(range.to);
    }
    return m;
}

/** Cash taken at the door that has not yet reached the office. */
export async function cashInHand() {
    const rows = await Order.aggregate([
        { $match: { paymentStatus: PAID, paymentMethod: 'cash', cashSettledAt: null } },
        { $unwind: '$items' },
        {
            $group: {
                _id: { order: '$_id', courier: '$cashCollectedBy' },
                deliveryFee: { $first: '$deliveryFee' },
                goods: { $sum: { $multiply: [
                    { $add: ['$items.priceSnapshot', { $ifNull: ['$items.depositSnapshot', 0] }] },
                    '$items.qty'] } },
            },
        },
        {
            $group: {
                _id: '$_id.courier',
                orders: { $sum: 1 },
                amount: { $sum: { $add: ['$goods', { $ifNull: ['$deliveryFee', 0] }] } },
            },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'courier' } },
        { $unwind: { path: '$courier', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0, courierId: '$_id', orders: 1, amount: 1,
                name: '$courier.name', phone: '$courier.phone',
            },
        },
        { $sort: { amount: -1 } },
    ]);

    return {
        total: rows.reduce((sum, r) => sum + (r.amount || 0), 0),
        byCourier: rows,
    };
}

/*
 * Revenue is recomputed from the line items rather than read from a stored
 * total: `priceSnapshot` and `depositSnapshot` are what the customer was
 * actually charged, so a later price change cannot rewrite history. The
 * delivery fee is added per order, which is why it is summed with $first inside
 * the per-order grouping.
 */
const REVENUE_STAGES = [
    { $unwind: '$items' },
    {
        $group: {
            _id: '$_id',
            paidAt: { $first: '$paidAt' },
            courierId: { $first: '$courierId' },
            deliveryFee: { $first: '$deliveryFee' },
            goods: { $sum: { $multiply: [
                { $add: ['$items.priceSnapshot', { $ifNull: ['$items.depositSnapshot', 0] }] },
                '$items.qty'] } },
        },
    },
    { $addFields: { total: { $add: ['$goods', { $ifNull: ['$deliveryFee', 0] }] } } },
];

export async function byDay(range: Range) {
    return Order.aggregate([
        { $match: match(range) },
        ...REVENUE_STAGES,
        {
            $group: {
                _id: { $dateToString: {
                    format: '%Y-%m-%d', date: '$paidAt',
                    timezone: `+0${TZ_OFFSET_HOURS}:00`,
                } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' },
                delivery: { $sum: { $ifNull: ['$deliveryFee', 0] } },
            },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', orders: '$orders', revenue: '$revenue', delivery: '$delivery' } },
    ]);
}

export async function byCourier(range: Range) {
    return Order.aggregate([
        { $match: match(range) },
        ...REVENUE_STAGES,
        {
            $group: {
                _id: '$courierId',
                orders: { $sum: 1 },
                revenue: { $sum: '$total' },
            },
        },
        { $sort: { orders: -1 } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'courier' } },
        {
            $project: {
                _id: 0,
                // Orders delivered before any courier was assigned still count
                // towards revenue and must not vanish from the report.
                name: { $ifNull: [{ $first: '$courier.name' }, 'Biriktirilmagan'] },
                phone: { $first: '$courier.phone' },
                orders: '$orders',
                revenue: '$revenue',
                courierId: '$_id',
            },
        },
    ]);
}

export async function byProduct(range: Range) {
    return Order.aggregate([
        { $match: match(range) },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                name: { $last: '$items.nameSnapshot' },
                qty: { $sum: '$items.qty' },
                revenue: { $sum: { $multiply: [
                    { $add: ['$items.priceSnapshot', { $ifNull: ['$items.depositSnapshot', 0] }] },
                    '$items.qty'] } },
            },
        },
        { $sort: { revenue: -1 } },
        { $project: { _id: 0, name: '$name', qty: '$qty', revenue: '$revenue', productId: '$_id' } },
    ]);
}

export async function summary(range: Range) {
    const [agg] = await Order.aggregate([
        { $match: match(range) },
        ...REVENUE_STAGES,
        {
            $group: {
                _id: null,
                orders: { $sum: 1 },
                revenue: { $sum: '$total' },
                delivery: { $sum: { $ifNull: ['$deliveryFee', 0] } },
            },
        },
    ]);

    const orders = agg?.orders ?? 0;
    const revenue = agg?.revenue ?? 0;
    return {
        orders,
        revenue,
        delivery: agg?.delivery ?? 0,
        averageOrder: orders > 0 ? Math.round(revenue / orders) : 0,
    };
}

export async function fullReport(range: Range) {
    const [totals, days, couriers, products, cash] = await Promise.all([
        summary(range), byDay(range), byCourier(range), byProduct(range), cashInHand(),
    ]);
    // `cash` is deliberately not filtered by the range: money still out with a
    // courier is owed today regardless of which week it was collected in.
    return { range, totals, days, couriers, products, cash };
}

/**
 * Renders rows as CSV for the accountant.
 *
 * Fields are quoted and embedded quotes doubled, per RFC 4180 — a product name
 * containing a comma would otherwise shift every column after it. The BOM is
 * what makes Excel read the file as UTF-8 instead of mangling Cyrillic and
 * o'zbek apostrophes.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '﻿';

    const headers = Object.keys(rows[0]);

    /*
     * Quoting is not enough on its own: Excel and Sheets treat a cell beginning
     * =, +, - or @ as a formula, so a product name entered as
     * `=HYPERLINK(...)` would execute when the accountant opened the export.
     * Prefixing a tab neutralises it while leaving the text readable.
     */
    const escape = (v: unknown) => {
        const raw = String(v ?? '');
        const safe = /^[=+\-@\t\r]/.test(raw) ? `\t${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
    };

    return '﻿'
        + headers.map(escape).join(',') + '\r\n'
        + rows.map(r => headers.map(h => escape(r[h])).join(',')).join('\r\n')
        + '\r\n';
}

export const ReportService = { byDay, byCourier, byProduct, summary, cashInHand, fullReport, toCsv };

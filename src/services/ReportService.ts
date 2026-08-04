import Order from '../models/Order';

/**
 * The numbers the owner needs to run the business, rather than the single
 * lifetime revenue figure the dashboard used to show.
 *
 * Revenue counts delivered orders only. Anything still in flight has not been
 * paid for, and counting it would report money the business does not have —
 * which is the one mistake in a revenue report that actually causes harm.
 */

const DELIVERED = 'delivered';

export interface Range {
    from?: string;
    to?: string;
}

/** Inclusive of both ends: `to` is pushed to the end of that day. */
function match(range: Range) {
    const m: Record<string, any> = { status: DELIVERED };
    if (range.from || range.to) {
        m.createdAt = {};
        if (range.from) m.createdAt.$gte = new Date(range.from + 'T00:00:00.000Z');
        if (range.to) m.createdAt.$lte = new Date(range.to + 'T23:59:59.999Z');
    }
    return m;
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
            createdAt: { $first: '$createdAt' },
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
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
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
    const [totals, days, couriers, products] = await Promise.all([
        summary(range), byDay(range), byCourier(range), byProduct(range),
    ]);
    return { range, totals, days, couriers, products };
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

export const ReportService = { byDay, byCourier, byProduct, summary, fullReport, toCsv };

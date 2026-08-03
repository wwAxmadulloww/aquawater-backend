/**
 * How an order is written down, in one place.
 *
 * Before this, the same order appeared to the customer as
 * #6a6ad4bcb8fa845351f6c4f8 on the confirmation screen, #51f6c4f8 in their
 * order list, and #f6c4f8 to the courier holding it and to the operator in
 * Telegram — four formats for one order, none of which could be read out over
 * the phone. Six uppercase characters is what the bot already used, so that is
 * the format everything else moves to.
 */
export const orderCode = (id: string): string =>
    String(id).slice(-6).toUpperCase();

/**
 * Payment method for display.
 *
 * The raw enum was being printed straight from the database, so an Uzbek
 * interface said "Cash" and the courier's screen said "CASH". The labels
 * already existed in every dictionary; nothing was reading them.
 */
export const paymentKey = (method: string): string => {
    const known = ['cash', 'click', 'payme'];
    const m = String(method || '').toLowerCase();
    return known.includes(m) ? `checkout.payment.${m}` : 'orders.payment';
};

/**
 * Goods, including any container charge, at the prices captured at purchase.
 *
 * `depositSnapshot` is what the customer paid to keep a returnable container.
 * Leaving it out repeated the delivery-fee mistake exactly: the courier at the
 * door would be shown less than the customer owes.
 */
export const itemsTotal = (order: any): number =>
    (order?.items || []).reduce(
        (sum: number, i: any) =>
            sum + ((i.priceSnapshot || 0) + (i.depositSnapshot || 0)) * (i.qty || 0),
        0,
    );

/**
 * What the customer actually pays: goods plus the delivery charge.
 *
 * Every screen that shows a total has to use this. Six of them were summing the
 * line items only, so after delivery fees were introduced the courier collecting
 * cash at the door was shown less than the customer owed, and the operator, the
 * customer's own order list and the accountant's export all understated the
 * takings by the fee.
 */
export const orderTotal = (order: any): number =>
    itemsTotal(order) + (order?.deliveryFee || 0);

/**
 * What an order does to the customer's container balance.
 *
 * One rule, read by the customer's order list and by the courier at the door,
 * so the two can never describe the same delivery differently.
 *
 * `toReturn` is the count the order recorded when it was placed. Orders from
 * before that was stored report null rather than zero: the client cannot tell
 * which of their lines were returnable, and inventing a zero would tell a
 * customer holding four bottles that they owe nothing.
 */
export const orderBottles = (order: any): { toReturn: number | null; bought: number; collected: number } => ({
    toReturn: typeof order?.bottlesIssued === 'number' ? order.bottlesIssued : null,
    bought: (order?.items || []).reduce(
        (n: number, i: any) => n + ((i.depositSnapshot || 0) > 0 ? (i.qty || 0) : 0), 0),
    collected: Number(order?.emptiesCollected || 0),
});

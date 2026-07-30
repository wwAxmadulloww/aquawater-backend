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

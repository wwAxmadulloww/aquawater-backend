import mongoose, { Document, Schema } from 'mongoose';
import { IOrderItem, IAddressSnapshot } from './Order';

/**
 * A standing order: the same delivery, on the same weekday, until cancelled.
 *
 * Water is the archetypal repeat purchase — a household orders the same two
 * bottles every week — and without this the business had to win that order
 * again every single time. The subscription holds everything an order needs,
 * so the scheduled run is a straight handoff to the normal order path with no
 * customer involved.
 *
 * `nextRunAt` is stored rather than derived so the scheduler is a single
 * indexed query for due rows, instead of loading every subscription and
 * recomputing weekday arithmetic for each one.
 */

export interface ISubscriptionItem {
    productId: mongoose.Types.ObjectId;
    qty: number;
    /**
     * Whether the container goes back, carried from the basket the standing
     * order was created from. Without it every weekly order reverted to
     * returning, and a customer who had bought their bottles outright would be
     * chased each week for containers they own.
     */
    returnBottle?: boolean;
}

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    items: ISubscriptionItem[];
    addressSnapshot: IAddressSnapshot;
    /** 1 = Monday … 7 = Sunday, matching ISO weekday numbering. */
    weekday: number;
    deliveryTimeSlot: string;
    paymentMethod: 'cash' | 'click' | 'payme';
    isActive: boolean;
    nextRunAt: Date;
    lastRunAt?: Date;
    /** Orders this subscription has created, for the customer's own record. */
    createdOrders: number;
}

const SubscriptionItemSchema = new Schema<ISubscriptionItem>({
    _id: false,
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1, max: 100 },
    returnBottle: { type: Boolean, default: true },
} as any);

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        items: { type: [SubscriptionItemSchema], required: true },
        addressSnapshot: { type: Schema.Types.Mixed, required: true },
        weekday: { type: Number, required: true, min: 1, max: 7 },
        deliveryTimeSlot: { type: String, required: true },
        paymentMethod: { type: String, enum: ['cash', 'click', 'payme'], required: true },
        isActive: { type: Boolean, default: true },
        nextRunAt: { type: Date, required: true, index: true },
        lastRunAt: { type: Date },
        createdOrders: { type: Number, default: 0 },
    },
    { timestamps: true }
);

/** The next occurrence of an ISO weekday, at midnight UTC, strictly in the future. */
export function nextOccurrence(weekday: number, from: Date = new Date()): Date {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    // getUTCDay() is 0 for Sunday; ISO numbering puts Sunday at 7.
    const current = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    let ahead = weekday - current;
    // Never schedule for today: the slot for today may already have passed, and
    // a subscription that fires on the day it is created surprises the customer.
    if (ahead <= 0) ahead += 7;
    d.setUTCDate(d.getUTCDate() + ahead);
    return d;
}

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

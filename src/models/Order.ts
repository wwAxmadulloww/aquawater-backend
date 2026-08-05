import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    nameSnapshot: string;
    priceSnapshot: number;
    qty: number;
    /**
     * Whether the container goes back to the depot.
     *
     * True is the cheaper choice and puts the container on the customer's
     * ledger; false charges `depositSnapshot` per unit and the customer keeps
     * it, so nothing is owed back.
     */
    returnBottle: boolean;
    /** Per-unit container charge captured at purchase. 0 when returning. */
    depositSnapshot: number;
}

export interface IAddressSnapshot {
    region: string;
    city: string;
    district: string;
    street: string;
    house: string;
    apartment?: string;
}

export interface IOrder extends Document {
    userId: mongoose.Types.ObjectId;
    items: IOrderItem[];
    addressSnapshot: IAddressSnapshot;
    courierId?: mongoose.Types.ObjectId;
    deliveryDate: string;
    deliveryTimeSlot: string;
    paymentMethod: 'cash' | 'click' | 'payme';
    /** Charged once per order, from the delivery zone in force when it was placed. */
    deliveryFee: number;
    /** Empty containers the courier took back on this delivery. */
    emptiesCollected?: number;
    /**
     * Returnable containers this order handed over, snapshotted when it was
     * placed. Absent on orders from before it was recorded; those fall back to
     * counting the items.
     */
    bottlesIssued?: number;
    status: 'pending' | 'confirmed' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

    /*
     * Money, tracked separately from delivery.
     *
     * "Delivered" and "paid for" were the same fact, which for a cash business
     * is the one thing that must never be assumed: a courier could mark a stop
     * done, keep the notes, and the day's revenue report would still show the
     * sale. The shop had no way to tell what it had actually banked.
     *
     * `paymentStatus` is what the customer owes; the cash fields are the chain
     * of custody for the notes themselves — who took them at the door, and
     * whether they have since reached the office.
     */
    paymentStatus: 'unpaid' | 'paid' | 'refunded';
    paidAt?: Date;
    /** The courier who took the cash at the door. */
    cashCollectedBy?: mongoose.Types.ObjectId;
    /** Set when that cash is handed in and counted at the office. */
    cashSettledAt?: Date;
    cashSettledBy?: mongoose.Types.ObjectId;

    createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    returnBottle: { type: Boolean, default: true },
    depositSnapshot: { type: Number, default: 0, min: 0 },
});

const AddressSnapshotSchema = new Schema<IAddressSnapshot>({
    region: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    street: { type: String, required: true },
    house: { type: String, required: true },
    apartment: { type: String },
});

const OrderSchema = new Schema<IOrder>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: [OrderItemSchema],
        addressSnapshot: { type: AddressSnapshotSchema, required: true },
        courierId: { type: Schema.Types.ObjectId, ref: 'User' },
        deliveryDate: { type: String, required: true },
        deliveryTimeSlot: { type: String, required: true },
        paymentMethod: { type: String, enum: ['cash', 'click', 'payme'], required: true },
        deliveryFee: { type: Number, default: 0, min: 0 },
        emptiesCollected: { type: Number, default: 0, min: 0 },
        bottlesIssued: { type: Number, min: 0 },
        status: { type: String, enum: ['pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled'], default: 'pending' },

        paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
        paidAt: { type: Date },
        cashCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        cashSettledAt: { type: Date },
        cashSettledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

/*
 * The queries this collection actually serves, in the shape they arrive.
 *
 * There were no indexes at all: every customer opening their order list, every
 * courier loading their round and every report scanned the whole collection.
 * At twenty orders that is invisible and at a hundred thousand it is the
 * difference between a page and a timeout — the kind of thing that is free to
 * fix now and an outage to discover later.
 *
 * Each one is compound and ends in `createdAt` because every list is sorted
 * newest-first, which lets Mongo satisfy the filter and the sort from the same
 * index instead of sorting the matches in memory.
 */
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ courierId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
// Reports match on status and group by date.
OrderSchema.index({ status: 1, deliveryDate: 1 });
// The cash-in-hand screen: collected at the door, not yet handed in.
OrderSchema.index({ paymentStatus: 1, cashSettledAt: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);

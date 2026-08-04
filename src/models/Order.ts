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
    },
    { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    nameSnapshot: string;
    priceSnapshot: number;
    qty: number;
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
    workerId?: mongoose.Types.ObjectId;
    deliveryDate: string;
    deliveryTimeSlot: string;
    paymentMethod: 'cash' | 'click' | 'payme';
    status: 'pending' | 'accepted' | 'delivered';
    createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
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
        workerId: { type: Schema.Types.ObjectId, ref: 'User' },
        deliveryDate: { type: String, required: true },
        deliveryTimeSlot: { type: String, required: true },
        paymentMethod: { type: String, enum: ['cash', 'click', 'payme'], required: true },
        status: { type: String, enum: ['pending', 'accepted', 'delivered'], default: 'pending' },
    },
    { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);

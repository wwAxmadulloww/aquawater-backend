import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    category: 'water' | 'equipment' | 'accessories' | 'service';
    productType: 'product' | 'service';
    description: string;
    price: number;
    imageUrl: string;
    inStock: boolean;
    /**
     * True for the 19L and 10L bottles: the customer keeps the container and
     * owes it back. Drives the bottle ledger, so a dispenser or a pump — sold
     * outright — never lands in someone's outstanding balance.
     */
    returnable: boolean;
    /**
     * Charged per unit when the customer keeps the container instead of
     * returning it. Only meaningful while `returnable` is true: it is the price
     * of the bottle itself, which the deposit model otherwise lends out.
     */
    depositPrice?: number | null;
    /**
     * Units on hand, or null when this product is not counted (services, and
     * anything ordered to order). `inStock` alone could not stop the shop
     * selling two hundred bottles on a day it had forty.
     */
    stockQty?: number | null;
    /**
     * When someone last physically counted this product.
     *
     * Null means the figure has never been verified against the shelf — which
     * is the honest state for any number the system was seeded with. The admin
     * panel shows those as uncounted rather than presenting a guess as fact.
     */
    stockCountedAt?: Date | null;
    workerId?: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
}

const ProductSchema = new Schema<IProduct>(
    {
        name: { type: String, required: true },
        category: { type: String, enum: ['water', 'equipment', 'accessories', 'service'], required: true },
        productType: { type: String, enum: ['product', 'service'], default: 'product' },
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        imageUrl: { type: String, required: true },
        inStock: { type: Boolean, default: true },
        returnable: { type: Boolean, default: false },
        depositPrice: { type: Number, default: null, min: 0 },
        stockQty: { type: Number, default: null, min: 0 },
        stockCountedAt: { type: Date, default: null },
        workerId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    },
    { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);

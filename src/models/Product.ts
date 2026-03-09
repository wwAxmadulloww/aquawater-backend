import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    category: 'water' | 'equipment' | 'accessories' | 'service';
    productType: 'product' | 'service';
    description: string;
    price: number;
    imageUrl: string;
    inStock: boolean;
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
        workerId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    },
    { timestamps: true }
);

export default mongoose.model<IProduct>('Product', ProductSchema);

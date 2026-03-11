import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    workingHours: string;
    isActive: boolean;
    deliveryZone?: string;
    description?: string;
}

const BranchSchema = new Schema<IBranch>(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        workingHours: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        deliveryZone: { type: String },
        description: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IBranch>('Branch', BranchSchema);

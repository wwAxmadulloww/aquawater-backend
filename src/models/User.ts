import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress {
    region: string;
    city: string;
    district: string;
    street: string;
    house: string;
    apartment?: string;
}

export interface IUser extends Document {
    name: string;
    phone: string;
    passwordHash: string;
    /**
     * Returnable containers this customer currently holds. A cache of the sum
     * of their BottleMovement rows, kept for screens that only need the figure;
     * the ledger remains the source of truth.
     */
    bottleBalance: number;
    role: 'customer' | 'admin' | 'courier' | 'super_admin';
    preferredLanguage: 'uz' | 'ru' | 'en';
    addresses: IAddress[];
    isPhoneVerified: boolean;
}

const AddressSchema = new Schema<IAddress>({
    region: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    street: { type: String, required: true },
    house: { type: String, required: true },
    apartment: { type: String },
});

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: false }, // Made optional for phone-first registration
        phone: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: false }, // Made optional for multi-step registration
        bottleBalance: { type: Number, default: 0 },
        role: { type: String, enum: ['customer', 'admin', 'courier', 'super_admin'], default: 'customer' },
        preferredLanguage: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
        addresses: [AddressSchema],
        isPhoneVerified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);

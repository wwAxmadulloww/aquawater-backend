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
    role: 'customer' | 'admin' | 'worker' | 'courier' | 'super_admin';
    preferredLanguage: 'uz' | 'ru' | 'en';
    addresses: IAddress[];
    isPhoneVerified: boolean;
    otp?: string;
    otpExpires?: Date;
    lastOtpResend?: Date;
    otpMock?: string;
    workerType?: string;
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
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['customer', 'admin', 'worker', 'courier', 'super_admin'], default: 'customer' },
        preferredLanguage: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
        addresses: [AddressSchema],
        isPhoneVerified: { type: Boolean, default: false },
        otp: { type: String },
        otpExpires: { type: Date },
        lastOtpResend: { type: Date },
        otpMock: { type: String },
        workerType: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);

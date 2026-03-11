import mongoose, { Document, Schema } from 'mongoose';

export interface IPhoneVerification extends Document {
    phone: string;
    code: string;
    expiresAt: Date;
    verified: boolean;
    used: boolean;
    attempts: number;
    lastResendAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PhoneVerificationSchema = new Schema<IPhoneVerification>(
    {
        phone: { type: String, required: true, index: true },
        code: { type: String, required: true },
        expiresAt: { type: Schema.Types.Date, required: true },
        verified: { type: Boolean, default: false },
        used: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        lastResendAt: { type: Schema.Types.Date },
    },
    { timestamps: true }
);

// TTL index to automatically delete expired verifications after some time (e.g., 24 hours)
PhoneVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<IPhoneVerification>('PhoneVerification', PhoneVerificationSchema);

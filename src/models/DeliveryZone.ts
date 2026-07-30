import mongoose, { Document, Schema } from 'mongoose';

/**
 * Where the business actually delivers, and what it charges to get there.
 *
 * Until this existed every address in the country was orderable and every
 * delivery was implicitly free, so an order could arrive from a region with no
 * courier in it — a promise the business could not keep and had no way to
 * refuse.
 *
 * Matching is by region name, the field the checkout already collects. A zone
 * that is absent means "we do not deliver there" rather than "free": refusing
 * up front is cheaper for everyone than cancelling afterwards.
 */

export interface IDeliveryZone extends Document {
    region: string;
    /** Charged per order, not per item. 0 is a legitimate value — free delivery. */
    fee: number;
    /** Orders below this are refused, so a courier is never sent out for pennies. */
    minOrder: number;
    /** Shown to the customer as an expectation, e.g. "2-4 soat". */
    eta?: string;
    isActive: boolean;
}

const DeliveryZoneSchema = new Schema<IDeliveryZone>(
    {
        region: { type: String, required: true, unique: true, trim: true },
        fee: { type: Number, required: true, min: 0, default: 0 },
        minOrder: { type: Number, required: true, min: 0, default: 0 },
        eta: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model<IDeliveryZone>('DeliveryZone', DeliveryZoneSchema);

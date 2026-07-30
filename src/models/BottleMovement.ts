import mongoose, { Document, Schema } from 'mongoose';

/**
 * Every returnable container that leaves or comes back to the depot.
 *
 * An append-only ledger rather than a counter, because the question the owner
 * actually needs answered is not "how many are out" but "who has them and
 * since when" — a bare number tells you a hundred bottles are missing without
 * telling you where to go and ask. Each row is one movement, and a customer's
 * balance is the sum of their rows.
 *
 * `User.bottleBalance` caches that sum for screens that only need the figure;
 * this collection stays the source of truth, so a disagreement is always
 * resolved in the ledger's favour.
 */

export type BottleDirection = 'issued' | 'returned' | 'adjustment';

export interface IBottleMovement extends Document {
    userId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    /** Positive when containers go out, negative when they come back. */
    delta: number;
    direction: BottleDirection;
    /** Who recorded it — the courier on delivery, or an admin correcting. */
    recordedBy?: mongoose.Types.ObjectId;
    note?: string;
    createdAt: Date;
}

const BottleMovementSchema = new Schema<IBottleMovement>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
        delta: { type: Number, required: true },
        direction: { type: String, enum: ['issued', 'returned', 'adjustment'], required: true },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, maxlength: 300 },
    },
    { timestamps: true }
);

/*
 * One movement per order per direction. Delivery notifications can be retried
 * and a courier can double-tap "delivered"; without this a single delivery
 * could be counted twice and the customer would appear to owe bottles they
 * never received. `sparse` keeps manual adjustments, which carry no orderId,
 * out of the constraint.
 */
BottleMovementSchema.index(
    { orderId: 1, direction: 1 },
    { unique: true, sparse: true },
);

export default mongoose.model<IBottleMovement>('BottleMovement', BottleMovementSchema);

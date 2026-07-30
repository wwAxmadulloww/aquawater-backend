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
 * One movement per order per direction, so a retried delivery notification or a
 * double-tapped "delivered" cannot count the same delivery twice and leave a
 * customer apparently owing bottles they never received.
 *
 * `partialFilterExpression` rather than `sparse`. On a COMPOUND index sparse
 * only skips a document when every indexed field is missing, and `direction` is
 * always present — so manual adjustments, which carry no orderId, were indexed
 * as (null, 'adjustment') and collided with each other. Exactly one manual
 * correction could ever be recorded in the whole database; every later one was
 * rejected as a duplicate. The partial filter restricts the constraint to
 * movements that actually belong to an order.
 */
BottleMovementSchema.index(
    { orderId: 1, direction: 1 },
    { unique: true, partialFilterExpression: { orderId: { $exists: true } } },
);

export default mongoose.model<IBottleMovement>('BottleMovement', BottleMovementSchema);

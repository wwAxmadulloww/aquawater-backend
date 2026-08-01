import mongoose, { Document, Schema } from 'mongoose';
import { BotLang } from '../telegram/texts';

/**
 * Links a Telegram chat to an AquaWater account and stores per-chat bot state.
 *
 * Kept separate from `User` because a Telegram chat may exist long before (or
 * without ever) being linked to a registered customer.
 */
export type AwaitingStep =
    | 'phone'
    | 'region' | 'city' | 'district' | 'street' | 'house'
    | null;

export interface Address {
    region: string;
    city: string;
    district: string;
    street: string;
    house: string;
    apartment?: string;
}

export interface OrderDraft extends Partial<Address> {
    deliveryDate?: string;
    deliveryTimeSlot?: string;
    paymentMethod?: 'cash' | 'click' | 'payme';
}

export interface IBotUser extends Document {
    chatId: string;
    telegramId?: number;
    firstName?: string;
    username?: string;
    language: BotLang;
    phone?: string;
    userId?: mongoose.Types.ObjectId;
    /** Set when the bot is waiting for a specific reply, e.g. a shared contact. */
    awaiting?: AwaitingStep;
    /** Basket held in the chat, so ordering never has to leave Telegram. */
    cart: { productId: mongoose.Types.ObjectId; qty: number; returnBottle?: boolean }[];
    /** Checkout in progress. Cleared once the order is placed or abandoned. */
    draft?: OrderDraft;
    /** Last address used, offered as a one-tap answer on the next order. */
    lastAddress?: Address;
    /** When this chat was last nudged to reorder, so it is not nudged weekly. */
    lastRemindedAt?: Date;
    isBlocked: boolean;
    lastSeenAt: Date;
}

const BotUserSchema = new Schema<IBotUser>(
    {
        chatId: { type: String, required: true, unique: true, index: true },
        telegramId: { type: Number },
        firstName: { type: String },
        username: { type: String },
        language: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
        phone: { type: String, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        awaiting: {
            type: String,
            enum: ['phone', 'region', 'city', 'district', 'street', 'house', null],
            default: null,
        },
        cart: {
            type: [{
                _id: false,
                productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
                qty: { type: Number, required: true, min: 1 },
                returnBottle: { type: Boolean, default: true },
            }],
            default: [],
        },
        draft: { type: Schema.Types.Mixed, default: null },
        lastAddress: { type: Schema.Types.Mixed, default: null },
        lastRemindedAt: { type: Date },
        // Set when Telegram reports the user blocked the bot, so we stop
        // wasting API calls on notifications that can never be delivered.
        isBlocked: { type: Boolean, default: false },
        lastSeenAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model<IBotUser>('BotUser', BotUserSchema);

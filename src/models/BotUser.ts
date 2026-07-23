import mongoose, { Document, Schema } from 'mongoose';
import { BotLang } from '../telegram/texts';

/**
 * Links a Telegram chat to an AquaWater account and stores per-chat bot state.
 *
 * Kept separate from `User` because a Telegram chat may exist long before (or
 * without ever) being linked to a registered customer.
 */
export interface IBotUser extends Document {
    chatId: string;
    telegramId?: number;
    firstName?: string;
    username?: string;
    language: BotLang;
    phone?: string;
    userId?: mongoose.Types.ObjectId;
    /** Set when the bot is waiting for a specific reply, e.g. a shared contact. */
    awaiting?: 'phone' | null;
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
        awaiting: { type: String, enum: ['phone', null], default: null },
        // Set when Telegram reports the user blocked the bot, so we stop
        // wasting API calls on notifications that can never be delivered.
        isBlocked: { type: Boolean, default: false },
        lastSeenAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model<IBotUser>('BotUser', BotUserSchema);

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AddressSchema = new mongoose_1.Schema({
    region: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    street: { type: String, required: true },
    house: { type: String, required: true },
    apartment: { type: String },
});
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: false }, // Made optional for phone-first registration
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: false }, // Made optional for multi-step registration
    role: { type: String, enum: ['customer', 'admin', 'worker', 'courier', 'super_admin'], default: 'customer' },
    preferredLanguage: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
    addresses: [AddressSchema],
    isPhoneVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    lastOtpResend: { type: Date },
    otpMock: { type: String },
    workerType: { type: String },
}, { timestamps: true });
exports.default = mongoose_1.default.model('User', UserSchema);

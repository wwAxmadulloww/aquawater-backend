"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const admin_1 = __importDefault(require("./routes/admin"));
const branches_1 = __importDefault(require("./routes/branches"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquawater';
// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'https://aquawater-two.vercel.app',
    'https://aquawater-uz.vercel.app'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/branches', branches_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'AquaWater API is running' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// Connect to MongoDB and start server
mongoose_1.default
    .connect(MONGODB_URI)
    .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
exports.default = app;

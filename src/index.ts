import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import branchRoutes from './routes/branches';
import telegramRoutes from './routes/telegram';
import { TelegramBotService } from './services/TelegramBotService';

dotenv.config();

const app = express();

// Trust proxy for Render / Vercel / Cloudflare load balancers
app.set('trust proxy', 1);

// Disable infinite query buffering so requests never hang if DB is connecting/disconnected
mongoose.set('bufferCommands', false);

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

if (IS_PRODUCTION && !process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET must be set in production. Refusing to start with a default secret.');
    process.exit(1);
}

// Explicit allow-list. `origin: '*'` together with `credentials: true` is invalid
// per the CORS spec and browsers reject every such response.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token'],
}));

app.use(express.json({ limit: '1mb' }));

// Connect MongoDB Atlas in background
mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('✅ MongoDB Atlas connected successfully'))
    .catch((err) => console.error('❌ MongoDB connection error:', err.message));

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

// Root health check endpoint
app.get('/', (_req, res) => {
    res.send('AquaWater Backend API is Live');
});

app.get('/api/health', (_req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'OK' : 'DEGRADED',
        message: 'AquaWater API is running',
        database: isDbConnected ? 'connected' : 'connecting_or_disconnected',
        telegramBot: TelegramBotService.isConfigured() ? 'configured' : 'not_configured',
        uptime: Math.round(process.uptime()),
    });
});

/**
 * Waits for the initial connection to settle, so a request arriving during a
 * cold start is not rejected while the driver is still connecting.
 */
const waitForDb = (timeoutMs: number): Promise<boolean> => new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve(true);

    const timer = setTimeout(() => {
        mongoose.connection.off('connected', onConnected);
        resolve(false);
    }, timeoutMs);

    function onConnected() {
        clearTimeout(timer);
        resolve(true);
    }

    mongoose.connection.once('connected', onConnected);
});

/**
 * Fails with a clear 503 when the database is unavailable. Without this,
 * `bufferCommands: false` surfaces a confusing generic 500 on every route.
 */
app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/telegram')) return next();
    if (mongoose.connection.readyState === 1) return next();

    void waitForDb(8000).then((connected) => {
        if (connected) return next();
        res.status(503).json({ message: 'Ma\'lumotlar bazasi vaqtincha mavjud emas. Birozdan so\'ng urinib ko\'ring.' });
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/telegram', telegramRoutes);

app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Endpoint topilmadi' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

// Start Express HTTP Server for standalone Node environments (Render, VPS)
const isServerless = process.env.VERCEL === '1';

if (!isServerless) {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on 0.0.0.0:${PORT}`);

        // Long-polling only works where a process stays alive. On serverless the
        // bot is driven by POST /api/telegram/webhook instead.
        if (process.env.TELEGRAM_USE_WEBHOOK === 'true') {
            console.log('🤖 [TelegramBotService] Webhook mode — polling disabled.');
        } else {
            void TelegramBotService.startPolling();
        }
    });

    const shutdown = (signal: string) => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        TelegramBotService.stopPolling();
        server.close(() => {
            mongoose.connection.close(false).finally(() => process.exit(0));
        });
        // Don't hang forever if a connection refuses to drain.
        setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;

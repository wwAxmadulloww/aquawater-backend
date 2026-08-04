import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import imageRoutes from './routes/images';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import branchRoutes from './routes/branches';
import telegramRoutes from './routes/telegram';
import operationsRoutes from './routes/operations';
import { DeliveryService } from './services/DeliveryService';
import { TelegramBotService } from './services/TelegramBotService';
import { waitForDb, initDb } from './config/db';

dotenv.config();

const app = express();

// Trust proxy for Render / Vercel / Cloudflare load balancers
app.set('trust proxy', 1);

// Disable infinite query buffering so requests never hang if DB is connecting/disconnected
mongoose.set('bufferCommands', false);

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Vercel functions re-evaluate this module on every cold start. `process.exit()`
// kills the whole invocation and Vercel reports it as FUNCTION_INVOCATION_FAILED
// for every request until the next cold start crashes again — a permanent outage
// from a single missing env var. Fail-fast-on-boot is only safe for a standalone
// process (Render/VPS) that hasn't accepted any traffic yet.
const IS_SERVERLESS = process.env.VERCEL === '1';

if (!IS_SERVERLESS) {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
        process.exit(1);
    }

    if (IS_PRODUCTION && !process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET must be set in production. Refusing to start with a default secret.');
        process.exit(1);
    }
}

// On serverless, the same conditions degrade gracefully instead of crashing:
// a missing MONGODB_URI leaves mongoose disconnected, which the /api readiness
// gate below turns into a 503; a missing JWT_SECRET surfaces as a 500 only on
// the specific request that tries to sign or verify a token (see config/jwt.ts).
if (IS_SERVERLESS && !MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set — all /api routes will return 503.');
}
if (IS_SERVERLESS && IS_PRODUCTION && !process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set — auth routes will fail until it is configured.');
}

// Explicit allow-list. `origin: '*'` together with `credentials: true` is invalid
// per the CORS spec and browsers reject every such response.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Express advertises itself and its version in every response otherwise.
app.disable('x-powered-by');

app.use(cors({
    /*
     * With no allow-list configured the API is same-origin with the site it
     * serves, so it does not need to answer any other origin. `true` reflected
     * whatever Origin was presented, which grants every website on the internet
     * a credentialed cross-origin channel it has no reason to have.
     */
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token'],
}));

app.use(express.json({ limit: '1mb' }));

/*
 * Baseline response hardening.
 *
 * Deliberately no X-Frame-Options: the site is also the bot's Telegram Mini
 * App, and DENY would stop it loading inside Telegram entirely. CSP
 * frame-ancestors expresses the same protection with an allow-list, which
 * X-Frame-Options cannot.
 */
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org");
    next();
});

// Connecting is owned by config/db, which keeps retrying. Guarded so a missing
// URI on serverless (already logged above) degrades to "never connects" instead
// of mongoose throwing on a non-string argument.
if (MONGODB_URI) {
    initDb(MONGODB_URI);
}

mongoose.connection.once('connected', () => {
    void DeliveryService.ensureSeeded()
        .catch((err) => console.error('[Delivery] Zone seed failed:', err?.message || err));
});

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

// Root health check endpoint
app.get('/', (_req, res) => {
    res.send('AquaWater Backend API is Live');
});

app.get('/api/health', async (_req, res) => {
    // Give a connecting container the same short grace the API gate gives it,
    // so health does not report DEGRADED for a state that resolves in under a
    // second and would otherwise page someone for nothing.
    const isDbConnected = await waitForDb(3000);
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'OK' : 'DEGRADED',
        message: 'AquaWater API is running',
        database: isDbConnected ? 'connected' : 'connecting_or_disconnected',
        telegramBot: TelegramBotService.isConfigured() ? 'configured' : 'not_configured',
        uptime: Math.round(process.uptime()),
    });
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
app.use('/api/images', imageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api', operationsRoutes);

app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Endpoint topilmadi' });
});

/*
 * Global error handler.
 *
 * Server faults are also pushed to the operator group. Until this existed the
 * only way anyone learned the site was broken was a customer complaining or
 * someone testing by hand — which is exactly how the Atlas outage was found.
 * 5xx only: a 400 is the client being told no, not a fault worth waking anyone.
 */
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    const status = err.status || 500;

    if (status >= 500) {
        void TelegramBotService.alertOperators(
            `${req.method} ${req.path} — ${err.message || 'Internal Server Error'}`,
            err?.stack,
        ).catch(() => {});
    }

    res.status(status).json({
        message: status >= 500 ? 'Internal Server Error' : (err.message || 'Bad Request'),
    });
});

// Start Express HTTP Server for standalone Node environments (Render, VPS)
if (!IS_SERVERLESS) {
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

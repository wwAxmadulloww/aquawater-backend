import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import branchRoutes from './routes/branches';

dotenv.config();

const app = express();

// Trust proxy for Render / Vercel / Cloudflare load balancers
app.set('trust proxy', 1);

// Disable infinite query buffering so requests never hang if DB is connecting/disconnected
mongoose.set('bufferCommands', false);

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Axmadullo:Axmadullo2006@cluster0.6w9v7az.mongodb.net/aquawater?retryWrites=true&w=majority';

// Enable CORS for all origins (Production ready)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Connect MongoDB Atlas in background
mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('✅ MongoDB Atlas connected successfully'))
    .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Root health check endpoint
app.get('/', (_req, res) => {
    res.send('AquaWater Backend API is Live');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);

app.get('/api/health', (_req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.json({
        status: 'OK',
        message: 'AquaWater API is running',
        database: isDbConnected ? 'connected' : 'connecting_or_disconnected'
    });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

// Start Express HTTP Server for standalone Node environments (Render, VPS)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    });
}

export default app;

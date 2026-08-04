import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Product from './models/Product';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquawater';

// This script deletes every user and product. Running it against the production
// Atlas cluster by accident wipes real customers and order history.
if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.error('❌ Refusing to run: this seed DELETES all users and products.');
    console.error('   Set ALLOW_DESTRUCTIVE_SEED=true in .env if that is what you want.');
    console.error(`   Target database: ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);
    process.exit(1);
}

const products = [
    {
        name: '19L Suv idishi',
        description: "19 litrlik tozalangan ichimlik suvi. Idish bilan birga yetkazamiz — bo'sh idishni keyingi yetkazishda olib ketamiz.",
        price: 25000,
        imageUrl: '/products/suv-19l.png',
        inStock: true,
        returnable: true,
        depositPrice: 35000,
    },
    {
        name: '10L Suv idishi',
        description: "10 litrlik tozalangan ichimlik suvi. Kichik oila va ofis uchun qulay. Idish qaytariladi.",
        price: 15000,
        imageUrl: '/products/suv-10l.png',
        inStock: true,
        returnable: true,
        depositPrice: 25000,
    },
    {
        name: 'Suv (idishsiz)',
        description: "O'z idishingiz bilan olasiz — faqat suv narxi. 1 litr uchun.",
        price: 10000,
        imageUrl: '/products/suv-quyma.png',
        inStock: true,
        returnable: false,
    },
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Create admin
        const adminPassword = await bcrypt.hash('admin123', 12);
        const admin = await User.create({
            name: 'Admin',
            phone: '+998901234567',
            passwordHash: adminPassword,
            role: 'admin',
            preferredLanguage: 'uz',
            isPhoneVerified: true,
        });
        console.log('👤 Admin created:', admin.phone);

        // Create customer
        const customerPassword = await bcrypt.hash('customer123', 12);
        const customer = await User.create({
            name: 'Test Foydalanuvchi',
            phone: '+998901111111',
            passwordHash: customerPassword,
            role: 'customer',
            preferredLanguage: 'uz',
            isPhoneVerified: true,
        });
        console.log('👤 Customer created:', customer.phone);

        // Create products
        const created = await Product.insertMany(products);
        console.log(`📦 ${created.length} products created`);

        console.log('\n✅ Seed completed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin Login:');
        console.log('  Phone:    +998901234567');
        console.log('  Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Customer Login:');
        console.log('  Phone:    +998901111111');
        console.log('  Password: customer123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seed();

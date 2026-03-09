import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Product from './models/Product';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquawater';

const products = [
    {
        name: '19L Suv idishi',
        category: 'water',
        productType: 'product',
        description: "19 litrlik toza ichimlik suvi. Idish bilan birga yetkazib beriladi. Sog'lom va tozalangan suv.",
        price: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&auto=format',
        inStock: true,
    },
    {
        name: '10L Suv idishi',
        category: 'water',
        productType: 'product',
        description: "10 litrlik qulay suv idishi. Kichik oilaviy iste'mol uchun ideal.",
        price: 15000,
        imageUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&h=400&fit=crop&auto=format',
        inStock: true,
    },
    {
        name: 'Suv dispanseri',
        category: 'equipment',
        productType: 'service',
        description: "Zamonaviy suv dispanseri. Issiq va sovuq suv. Elektr bilan ishlaydi. Oson o'rnatish.",
        price: 850000,
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format',
        inStock: true,
    },
    {
        name: 'Nasos (Pompa)',
        category: 'accessories',
        productType: 'product',
        description: "19L idish uchun elektr nasos. USB orqali zaryadlanadi. Qulay va tez ishlaydi.",
        price: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop&auto=format',
        inStock: true,
    },
    {
        name: 'Dispanser o\'rnatish xizmati',
        category: 'equipment',
        productType: 'service',
        description: "Professional dispanser o'rnatish xizmati. Usta uyingizga kelib o'rnatadi.",
        price: 50000,
        imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e12f6c?w=400&h=400&fit=crop&auto=format',
        inStock: true,
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

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Force path to .env file in the backend directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquawater';

async function verifyUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        const phone = '+998901234567';
        const result = await User.findOneAndUpdate(
            { phone },
            {
                $set: { isPhoneVerified: true },
                $unset: { otp: 1, otpExpires: 1, otpMock: 1 }
            },
            { new: true }
        );

        if (result) {
            console.log(`✅ User ${phone} successfully verified!`);
            console.log('User status:', {
                name: result.get('name'),
                role: result.get('role'),
                isPhoneVerified: result.get('isPhoneVerified')
            });
        } else {
            console.log(`❌ User with phone ${phone} not found.`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verifyUser();

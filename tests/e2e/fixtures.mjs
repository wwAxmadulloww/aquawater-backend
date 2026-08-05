/*
 * Creates the staff accounts the end-to-end suites sign in as.
 *
 * Registered through the public API so password hashing is the real thing,
 * then promoted directly in the database — there is deliberately no endpoint
 * that mints an administrator.
 *
 *   MONGODB_URI=... node tests/e2e/fixtures.mjs
 */
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
const BASE = process.env.BASE_URL || 'https://aquawater-backend.vercel.app';
if (!URI) { console.error('MONGODB_URI kerak'); process.exit(1); }

const PW = 'E2E-staff-' + Math.random().toString(36).slice(2, 8);
const STAFF = [
    ['+998900000002', 'E2E Courier', 'courier'],
    ['+998900000004', 'E2E Admin', 'admin'],
];

await mongoose.connect(URI);
const users = mongoose.connection.db.collection('users');

for (const [phone, name, role] of STAFF) {
    await users.deleteOne({ phone });
    const r = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, password: PW }),
    });
    if (!r.ok) { console.error('register failed', phone, r.status); continue; }
    await users.updateOne({ phone }, { $set: { role } });
}

await mongoose.disconnect();
console.log(`STAFF_PW=${PW}`);

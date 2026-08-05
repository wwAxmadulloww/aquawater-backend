import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/*
 * What happens when two things run at once.
 *
 * A retried cron, or an operator pressing run while the schedule fires, used
 * to produce a delivery per overlapping request from one weekly standing
 * order — eight at once made four. The claim has to hold that to one.
 */
import mongoose from 'mongoose';
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R = []; const rec = (n, ok, d) => { R.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) };
const c = async (m, p, o = {}) => {
    const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) }, ...(o.body ? { body: JSON.stringify(o.body) } : {}) });

    let j; try { j = await r.json() } catch { j = null } return { s: r.status, j };
};

if (!process.env.STAFF_PW || !process.env.MONGODB_URI) {
    console.error('STAFF_PW va MONGODB_URI kerak'); process.exit(1);
}

const admin = (await c('POST', '/auth/login', { body: { phone: '+998900000004', password: process.env.STAFF_PW } })).j.token;
const bottle = await makeTestBottle(admin);
const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const reg = await c('POST', '/auth/register', { body: { phone, name: 'E2E Concurrency', password: 'E2E-test-abc123' } });
const cust = reg.j.token, custId = reg.j.user._id;

const made = await c('POST', '/subscriptions', { token: cust, body: {
    items: [{ productId: bottle._id, qty: 1, returnBottle: true }],
    addressSnapshot: { region: 'Toshkent shahri', city: 'T', district: 'E2E-TEST', street: 'E2E-TEST', house: '1' },
    weekday: 3, deliveryTimeSlot: '09:00–11:00', paymentMethod: 'cash' } });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const oid = new mongoose.Types.ObjectId(custId);
await db.collection('subscriptions').updateOne(
    { _id: new mongoose.Types.ObjectId(made.j._id) }, { $set: { nextRunAt: new Date(Date.now() - 60000) } });

const runs = await Promise.all(Array.from({ length: 8 }, () => c('POST', '/subscriptions/run', { token: admin })));
await new Promise(r => setTimeout(r, 3000));

const created = await db.collection('orders').countDocuments({ userId: oid });
rec('eight overlapping runs deliver once, not eight times', created === 1,
    `${created} ta buyurtma (${runs.map(r => r.j?.ordersCreated).join(',')})`);

const sub = await db.collection('subscriptions').findOne({ _id: new mongoose.Types.ObjectId(made.j._id) });
rec('the subscription counts one delivery', sub?.createdOrders === 1, `createdOrders=${sub?.createdOrders}`);
rec('and is scheduled forward, not still due', new Date(sub.nextRunAt) > new Date(),
    new Date(sub.nextRunAt).toISOString().slice(0, 10));

await db.collection('orders').deleteMany({ userId: oid });
await db.collection('subscriptions').deleteMany({ userId: oid });
await db.collection('bottlemovements').deleteMany({ userId: oid });
await db.collection('users').deleteOne({ _id: oid });
await mongoose.disconnect();

const failed = R.filter(x => !x.ok);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
process.exit(failed.length ? 1 : 0);

await removeTestBottle(admin, bottle?._id);

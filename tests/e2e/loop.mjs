import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/*
 * The container loop, as a customer and a courier actually live it.
 *
 * Order with a mix of returned and bought containers, deliver it, order again,
 * hand the empties back. The balance has to be explainable at every step, and
 * a bought container must never appear in it.
 */
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R = [];
const rec = (n, ok, d) => { R.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) };
const c = async (m, p, o = {}) => {
    const r = await fetch(B + p, {
        method: m,
        headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) },
        ...(o.body ? { body: JSON.stringify(o.body) } : {}),
    });

    const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
    return { s: r.status, j };
};

const PW = process.env.STAFF_PW;
const admin = (await c('POST', '/auth/login', { body: { phone: '+998900000004', password: PW } })).j.token;
const courier = (await c('POST', '/auth/login', { body: { phone: '+998900000002', password: PW } })).j.token;
const users = rows((await c('GET', '/admin/users', { token: admin })).j);
const courierId = (Array.isArray(users) ? users : users.users).find(u => u.phone === '+998900000002')._id;

const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const cust = (await c('POST', '/auth/register', { body: { phone, name: 'E2E Loop', password: 'E2E-test-abc123' } })).j.token;

const bottle = await makeTestBottle(admin);
const addr = { region: 'Toshkent shahri', city: 'Toshkent', district: 'E2E-TEST', street: 'E2E-TEST', house: '1' };
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const place = (items) => c('POST', '/orders', {
    token: cust,
    body: { items, addressSnapshot: addr, deliveryDate: tomorrow, deliveryTimeSlot: '09:00–11:00', paymentMethod: 'cash' },
});
const deliver = async (id, empties) => {
    await c('PATCH', `/orders/${id}/assign`, { token: admin, body: { courierId } });
    await c('PATCH', `/orders/${id}/status`, { token: courier, body: { status: 'in_transit' } });
    return c('PATCH', `/orders/${id}/status`, { token: courier, body: { status: 'delivered', emptiesCollected: empties } });
};
const balance = async () => (await c('GET', '/bottles/me', { token: cust })).j?.balance ?? null;

console.log('\n── first delivery: 3 returned, 2 bought ──');

const o1 = await place([
    { productId: bottle._id, qty: 3, returnBottle: true },
    { productId: bottle._id, qty: 2, returnBottle: false },
]);
rec('the order records the containers it hands over', o1.j?.bottlesIssued === 3, 'bottlesIssued ' + o1.j?.bottlesIssued);
rec('only the bought line carries the container charge',
    o1.j?.items?.[0]?.depositSnapshot === 0 && o1.j?.items?.[1]?.depositSnapshot > 0,
    `${o1.j?.items?.[0]?.depositSnapshot} / ${o1.j?.items?.[1]?.depositSnapshot}`);
rec('nothing is owed before it arrives', (await balance()) === 0);

await deliver(o1.j._id, 0);
rec('after delivery the customer holds only what they agreed to return',
    (await balance()) === 3, 'balance ' + (await balance()));

console.log('\n── the courier is told what to expect ──');

const o2 = await place([{ productId: bottle._id, qty: 2, returnBottle: true }]);
await c('PATCH', `/orders/${o2.j._id}/assign`, { token: admin, body: { courierId } });

const round = rows((await c('GET', '/orders', { token: courier })).j).find(x => String(x._id) === String(o2.j._id));
rec('the card knows how many containers this stop carries', round?.bottlesIssued === 2,
    'bottlesIssued ' + round?.bottlesIssued);
rec('and how many the customer is already holding', Number(round?.userId?.bottleBalance) === 3,
    'held ' + round?.userId?.bottleBalance);

console.log('\n── the empties go back ──');

await deliver(o2.j._id, 3);
const after = await balance();
rec('handing back three clears three', after === 2, `3 + 2 − 3 = ${after}`);

const stmt = (await c('GET', '/bottles/me', { token: cust })).j;
rec('every change is explained by a row', (stmt.movements || []).length === 3,
    (stmt.movements || []).map(m => `${m.delta > 0 ? '+' : ''}${m.delta}`).join(' '));

console.log('\n── and the owner can chase what is out ──');

const chase = (await c('GET', '/bottles/outstanding', { token: admin })).j;
const mine = (chase.holders || []).find(h => h.phone === phone);
rec('the customer appears on the chase list with the right count', mine?.balance === 2,
    'listed ' + mine?.balance);
rec('the depot total agrees with the list',
    chase.summary?.outstanding >= 2, JSON.stringify(chase.summary));

const failed = R.filter(x => !x.ok);
console.log(`\naccount: ${phone}`);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
failed.forEach(f => console.log('  FAIL ' + f.n));

await removeTestBottle(admin, bottle?._id);

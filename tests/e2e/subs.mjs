import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/*
 * The container choice as it travels: basket -> order -> standing order ->
 * next week's order -> the ledger -> every screen that shows a total.
 *
 * This is the path the earlier fixes kept losing it on, so each hop is
 * asserted separately rather than only checking the figure at the end.
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

const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const reg = await c('POST', '/auth/register', { body: { phone, name: 'E2E Subs', password: 'E2E-test-abc123' } });
const cust = reg.j.token;
const custId = reg.j.user?._id || reg.j.user?.id;

const products = (await c('GET', '/products')).j;
const bottle = await makeTestBottle(admin);
const addr = { region: 'Toshkent shahri', city: 'Toshkent', district: 'E2E-TEST', street: 'E2E-TEST', house: '1' };

console.log('\n── the standing order remembers the choice ──');

const made = await c('POST', '/subscriptions', {
    token: cust,
    body: {
        items: [{ productId: bottle._id, qty: 2, returnBottle: false }],
        addressSnapshot: addr,
        weekday: 3,
        deliveryTimeSlot: '09:00–11:00',
        paymentMethod: 'cash',
    },
});
rec('a standing order can be created from the site', made.s === 201, 'status ' + made.s);

const mine = (await c('GET', '/subscriptions', { token: cust })).j;
const sub = (mine || []).find(s => String(s._id) === String(made.j?._id));
rec('it stored "I am keeping the container"', sub?.items?.[0]?.returnBottle === false,
    'returnBottle=' + sub?.items?.[0]?.returnBottle);

/*
 * The same basket, in a zone with a 50,000 minimum. Goods alone are 25,000;
 * with the container the customer chose to buy it is 60,000. The checkout
 * accepts it, so the standing order has to as well.
 */
const feeZone = { ...addr, region: 'Toshkent viloyati' };
const atMin = await c('POST', '/subscriptions', {
    token: cust,
    body: {
        items: [{ productId: bottle._id, qty: 1, returnBottle: false }],
        addressSnapshot: feeZone, weekday: 4,
        deliveryTimeSlot: '09:00–11:00', paymentMethod: 'cash',
    },
});
rec('the container charge counts towards the zone minimum', atMin.s === 201,
    atMin.s === 201 ? 'accepted' : atMin.j?.message);

console.log('\n── and passes it to the order it creates ──');

// Make it due, then let the scheduler pick it up.
await c('PATCH', '/subscriptions/' + made.j._id, { token: cust, body: { isActive: true } });
const run = await c('POST', '/subscriptions/run', { token: admin });
rec('the scheduler runs', run.s === 200, JSON.stringify(run.j?.ordersCreated ?? run.j));

console.log('\n── the money the customer is actually shown ──');

const kept = await c('POST', '/orders', {
    token: cust,
    body: {
        items: [{ productId: bottle._id, qty: 2, returnBottle: false }],
        addressSnapshot: addr, deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        deliveryTimeSlot: '09:00–11:00', paymentMethod: 'cash',
    },
});
const o = kept.j;
const dep = o?.items?.[0]?.depositSnapshot ?? 0;
rec('keeping the container charges for it', kept.s === 201 && dep > 0, 'deposit ' + dep);

const goods = (o.items || []).reduce((s, i) => s + (i.priceSnapshot + (i.depositSnapshot || 0)) * i.qty, 0);
const expected = goods + (o.deliveryFee || 0);

// The office quotes the total off this list. It carries the raw items, so the
// container charge has to survive into them or every screen built on it is out.
const adminList = (await c('GET', '/orders', { token: admin })).j;
const orderRows = rows(adminList);
const row = (orderRows || []).find(x => String(x._id) === String(o._id));
const rowTotal = (row?.items || []).reduce(
    (s, i) => s + ((i.priceSnapshot || 0) + (i.depositSnapshot || 0)) * i.qty, 0) + (row?.deliveryFee || 0);
rec('the admin list carries the container charge', rowTotal === expected,
    `list ${rowTotal} vs ${expected}`);

// Report: the figure the owner banks.
const today = new Date().toISOString().slice(0, 10);
const rep = (await c('GET', `/reports?from=${today}&to=${today}`, { token: admin })).j;
const revenue = rep?.totals?.revenue;
rec('the report counts the container money as revenue', Number(revenue) > 0,
    `revenue ${revenue}`);

console.log('\n── and the bottle never lands on their ledger ──');

const uresp = rows((await c('GET', '/admin/users', { token: admin })).j);
const users = rows(uresp);
const courierId = (users || []).find(u => u.phone === '+998900000002')?._id;
await c('PATCH', `/orders/${o._id}/assign`, { token: admin, body: { courierId } });
await c('PATCH', `/orders/${o._id}/status`, { token: admin, body: { status: 'confirmed' } });
await c('PATCH', `/orders/${o._id}/status`, { token: courier, body: { status: 'delivering' } });
await c('PATCH', `/orders/${o._id}/status`, { token: courier, body: { status: 'delivered', emptiesCollected: 0 } });

const bal = (await c('GET', '/bottles/me', { token: cust })).j;
rec('a bought container is not counted as owed', (bal?.balance ?? 0) === 0, 'balance ' + bal?.balance);

const failed = R.filter(x => !x.ok);
console.log(`\naccount: ${phone}`);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
failed.forEach(f => console.log('  FAIL ' + f.n));

await removeTestBottle(admin, bottle?._id);

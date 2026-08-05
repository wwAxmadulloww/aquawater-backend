/*
 * The money chain: order -> delivered -> cash taken -> handed in -> revenue.
 * Plus the two failure modes that matter: a stop marked done with no money,
 * and a list that used to return the whole collection.
 */
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R = []; const rec = (n, ok, d) => { R.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) };
const c = async (m, p, o = {}) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) }, ...(o.body ? { body: JSON.stringify(o.body) } : {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t } return { s: r.status, j };
};
const PW = process.env.STAFF_PW;
const admin = (await c('POST', '/auth/login', { body: { phone: '+998900000004', password: PW } })).j.token;
const courier = (await c('POST', '/auth/login', { body: { phone: '+998900000002', password: PW } })).j.token;
const users = (await c('GET', '/admin/users', { token: admin })).j;
const list = Array.isArray(users) ? users : users.items;
const courierId = list.find(u => u.phone === '+998900000002')._id;

const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const cust = (await c('POST', '/auth/register', { body: { phone, name: 'E2E Money', password: 'E2E-test-abc123' } })).j.token;
const bottle = (await c('GET', '/products')).j.find(p => p.name === '19L Suv idishi');
const addr = { region: 'Toshkent shahri', city: 'T', district: 'E2E-TEST', street: 'E2E-TEST', house: '1' };
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const place = () => c('POST', '/orders', { token: cust, body: {
  items: [{ productId: bottle._id, qty: 1, returnBottle: true }],
  addressSnapshot: addr, deliveryDate: tomorrow, deliveryTimeSlot: '09:00–11:00', paymentMethod: 'cash' } });
const deliver = async (id, paid) => {
  await c('PATCH', `/orders/${id}/assign`, { token: admin, body: { courierId } });
  await c('PATCH', `/orders/${id}/status`, { token: courier, body: { status: 'in_transit' } });
  return c('PATCH', `/orders/${id}/status`, { token: courier, body: { status: 'delivered', emptiesCollected: 0, paid } });
};
const get = async (id) => (await c('GET', `/orders/${id}`, { token: admin })).j;

console.log('\n── lists are bounded ──');
const page = await c('GET', '/orders?limit=2', { token: admin });
rec('the order list answers with a page', !Array.isArray(page.j) && Array.isArray(page.j?.items),
  Object.keys(page.j || {}).join(','));
rec('and honours the requested size', (page.j?.items || []).length <= 2, `${page.j?.items?.length} ta`);
rec('reporting the true total', Number(page.j?.total) > 2, 'total ' + page.j?.total);
const huge = await c('GET', '/orders?limit=99999', { token: admin });
rec('a caller cannot ask for everything', (huge.j?.items || []).length <= 100, `${huge.j?.items?.length} ta`);

console.log('\n── a new order owes money ──');
const o1 = await place();
rec('starts unpaid', o1.j?.paymentStatus === 'unpaid', o1.j?.paymentStatus);

console.log('\n── delivered with the cash ──');
await deliver(o1.j._id, true);
const paid = await get(o1.j._id);
rec('is marked paid', paid.paymentStatus === 'paid', paid.paymentStatus);
rec('records who took the money', String(paid.cashCollectedBy) === String(courierId));
rec('and that it has not reached the office yet', !paid.cashSettledAt);

console.log('\n── delivered WITHOUT the cash ──');
const o2 = await place();
await deliver(o2.j._id, false);
const debt = await get(o2.j._id);
rec('stays unpaid even though it was delivered', debt.status === 'delivered' && debt.paymentStatus === 'unpaid',
  `${debt.status} / ${debt.paymentStatus}`);

console.log('\n── the owner can see the cash that is still out ──');
const rep = (await c('GET', '/reports', { token: admin })).j;
const mine = (rep?.cash?.byCourier || []).find(x => String(x.courierId) === String(courierId));
rec('the courier appears with money in hand', !!mine && mine.amount > 0, `${mine?.amount} so'm, ${mine?.orders} ta`);
rec('the unpaid delivery is NOT counted as revenue',
  !(rep?.cash?.byCourier || []).some(x => x.orders > 1 && String(x.courierId) === String(courierId)) || mine.orders === 1,
  `${mine?.orders} ta buyurtma sanaldi`);

console.log('\n── handing it in ──');
const settled = await c('POST', '/orders/cash/settle', { token: admin, body: { courierId } });
rec('the office accepts the cash', settled.s === 200 && settled.j?.settled >= 1, JSON.stringify(settled.j));
const after = (await c('GET', '/reports', { token: admin })).j;
const still = (after?.cash?.byCourier || []).find(x => String(x.courierId) === String(courierId));
rec('and the courier no longer holds it', !still, still ? `${still.amount} qoldi` : 'toza');
rec('a customer cannot settle cash', (await c('POST', '/orders/cash/settle', { token: cust, body: { courierId } })).s === 403);

console.log('\n── a customer can call off their own order ──');
const o3 = await place();
const cancelled = await c('PATCH', `/orders/${o3.j._id}/cancel`, { token: cust });
rec('while it is still callable off', cancelled.s === 200 && cancelled.j?.status === 'cancelled', cancelled.j?.status);
const o4 = await place();
await deliver(o4.j._id, true);
const late = await c('PATCH', `/orders/${o4.j._id}/cancel`, { token: cust });
rec('but not once it has been delivered', late.s === 400, `${late.s}`);
const other = await c('PATCH', `/orders/${o1.j._id}/cancel`, { token: admin });
rec('and not somebody else\'s order', other.s === 403, `${other.s}`);

const failed = R.filter(x => !x.ok);
console.log(`\naccount: ${phone}`);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
failed.forEach(f => console.log('  FAIL ' + f.n));

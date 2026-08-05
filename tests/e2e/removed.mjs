/* What was taken out must actually be gone from the running service. */
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R = []; const rec = (n, ok, d) => { R.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) };
const c = async (m, p, o = {}) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) }, ...(o.body ? { body: JSON.stringify(o.body) } : {}) });
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t } return { s: r.status, j };
};
const PW = process.env.STAFF_PW;
const admin = (await c('POST', '/auth/login', { body: { phone: '+998900000004', password: PW } })).j.token;

const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const reg = await c('POST', '/auth/register', { body: { phone, name: 'E2E Removed', password: 'E2E-test-abc123' } });
const custId = reg.j.user?._id || reg.j.user?.id;

const ps = (await c('GET', '/products')).j;
rec('the catalogue is water only', ps.every(p => /suv/i.test(p.name)), ps.map(p => p.name).join(', '));
rec('no product carries a category any more', ps.every(p => p.category === undefined));
rec('nor a type', ps.every(p => p.productType === undefined));
rec('nor an approval state', ps.every(p => p.status === undefined));

const made = await c('POST', '/products', { token: admin, body: {
  name: 'E2E Suv', description: 'test', price: 1000,
  imageUrl: 'https://example.com/a.png', inStock: true } });
rec('a product can be created without a category', made.s === 201, 'status ' + made.s);

const approve = await c('PATCH', `/products/${made.j?._id}/approve`, { token: admin, body: { status: 'approved' } });
rec('the approval route is gone', approve.s === 404, 'status ' + approve.s);

const role = await c('PATCH', `/admin/users/${custId}/role`, { token: admin, body: { role: 'worker' } });
rec('the worker role is refused', role.s === 400, `${role.s} ${role.j?.message || ''}`);

const stillCourier = await c('PATCH', `/admin/users/${custId}/role`, { token: admin, body: { role: 'courier' } });
rec('courier is still a role', stillCourier.s === 200, 'status ' + stillCourier.s);

if (made.j?._id) await c('DELETE', `/products/${made.j._id}`, { token: admin });

const failed = R.filter(x => !x.ok);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
failed.forEach(f => console.log('  FAIL ' + f.n));

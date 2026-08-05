/* Uploading a product photo, and what happens when the file is not one. */
import { readFileSync } from 'node:fs';
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R = []; const rec = (n, ok, d) => { R.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) };
const j = async (m, p, o = {}) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) }, ...(o.body ? { body: JSON.stringify(o.body) } : {}) });
  const t = await r.text(); let b; try { b = JSON.parse(t) } catch { b = t } return { s: r.status, j: b };
};
const raw = async (bytes, type, token) => {
  const r = await fetch(B + '/products/image', {
    method: 'POST', headers: { 'Content-Type': type, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: bytes,
  });
  const t = await r.text(); let b; try { b = JSON.parse(t) } catch { b = t } return { s: r.status, j: b };
};

const PW = process.env.STAFF_PW;
const admin = (await j('POST', '/auth/login', { body: { phone: '+998900000004', password: PW } })).j.token;
const phone = '+9989' + String(Math.floor(10000000 + Math.random() * 89999999));
const cust = (await j('POST', '/auth/register', { body: { phone, name: 'E2E Upload', password: 'E2E-test-abc123' } })).j.token;

// A real 1x1 PNG, byte for byte.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);

console.log('\n── only an admin may upload ──');
rec('an anonymous upload is refused', (await raw(png, 'image/png')).s === 401);
rec('a customer upload is refused', (await raw(png, 'image/png', cust)).s === 403);

console.log('\n── only images get in ──');
const script = Buffer.from('<script>alert(1)</script>');
const asPng = await raw(script, 'image/png', admin);
rec('a script claiming to be a PNG is refused', asPng.s === 400, `${asPng.s} ${asPng.j?.message || ''}`);
const pdf = Buffer.from('%PDF-1.7\n%wrong');
rec('a PDF is refused', (await raw(pdf, 'application/octet-stream', admin)).s === 400);
rec('an empty body is refused', (await raw(Buffer.alloc(0), 'image/png', admin)).s === 400);
rec('a JPEG is accepted', (await raw(jpeg, 'image/jpeg', admin)).s === 201);

console.log('\n── the photo comes back ──');
const up = await raw(png, 'image/png', admin);
rec('the upload returns a path on this site', up.s === 201 && /^\/api\/images\/[a-f0-9]{24}$/.test(up.j?.url || ''), up.j?.url);

const got = await fetch('https://aquawater-backend.vercel.app' + up.j.url);
const bytes = Buffer.from(await got.arrayBuffer());
rec('it is served publicly, no login needed', got.status === 200);
rec('as an image', got.headers.get('content-type') === 'image/png', got.headers.get('content-type'));
rec('byte for byte what was sent', bytes.equals(png), `${bytes.length} vs ${png.length} bayt`);
rec('cached hard, so the catalogue does not refetch it',
  /immutable/.test(got.headers.get('cache-control') || ''), got.headers.get('cache-control'));
rec('and never sniffed as something else', got.headers.get('x-content-type-options') === 'nosniff');

console.log('\n── and a product can use it ──');
const made = await j('POST', '/products', { token: admin, body: {
  name: 'E2E Rasmli suv', description: 'test', price: 1000, imageUrl: up.j.url, inStock: true } });
rec('a product accepts an uploaded photo', made.s === 201, `${made.s} ${made.j?.errors?.[0]?.message || ''}`);

const bad = await j('POST', '/products', { token: admin, body: {
  name: 'E2E Yomon', description: 'test', price: 1000, imageUrl: 'javascript:alert(1)', inStock: true } });
rec('a javascript: src is refused', bad.s === 400, 'status ' + bad.s);
const proto = await j('POST', '/products', { token: admin, body: {
  name: 'E2E Yomon2', description: 'test', price: 1000, imageUrl: '//evil.example/x.png', inStock: true } });
rec('a protocol-relative src is refused', proto.s === 400, 'status ' + proto.s);

if (made.j?._id) await j('DELETE', `/products/${made.j._id}`, { token: admin });

const failed = R.filter(x => !x.ok);
console.log(`\n=== ${R.length - failed.length}/${R.length} passed`);
failed.forEach(f => console.log('  FAIL ' + f.n));

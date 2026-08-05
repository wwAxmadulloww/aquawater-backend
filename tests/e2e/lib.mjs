/**
 * Shared helpers for the end-to-end suites.
 *
 * The suites used to order the shop's real 19L bottle, which meant they drew
 * down actual stock: the first suite to run consumed it and every suite after
 * failed for want of inventory, so a green result depended on the order they
 * ran in and on somebody restocking by hand afterwards. A test that only passes
 * on a freshly stocked database is not a safety net.
 *
 * Each run now works against its own product, created with enough stock that
 * nothing competes, and removed by the cleanup that follows.
 */

export const BASE = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';

export const call = async (m, p, o = {}) => {
    const r = await fetch(BASE + p, {
        method: m,
        headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) },
        ...(o.body ? { body: JSON.stringify(o.body) } : {}),
    });
    const t = await r.text();
    let j; try { j = JSON.parse(t) } catch { j = t }
    return { s: r.status, j };
};

/** Lists answer with { items, total, … }; older deployments sent a bare array. */
export const rows = (d) => (Array.isArray(d) ? d : (d?.items ?? d?.users ?? d?.orders ?? []));

/**
 * A returnable product this run owns outright.
 *
 * Priced and stocked so a suite can order freely without exhausting anything,
 * and named with the E2E prefix the cleanup looks for.
 */
export async function makeTestBottle(adminToken, { price = 25000, deposit = 35000, stock = 500 } = {}) {
    const r = await call('POST', '/products', {
        token: adminToken,
        body: {
            name: `E2E Suv ${Math.random().toString(36).slice(2, 7)}`,
            description: 'End-to-end sinov uchun',
            price,
            imageUrl: '/products/suv-19l.png',
            inStock: true,
            returnable: true,
            depositPrice: deposit,
            stockQty: stock,
        },
    });
    if (r.s !== 201) throw new Error(`test product not created: ${r.s} ${JSON.stringify(r.j)}`);
    return r.j;
}

export async function removeTestBottle(adminToken, id) {
    if (id) await call('DELETE', `/products/${id}`, { token: adminToken }).catch(() => {});
}

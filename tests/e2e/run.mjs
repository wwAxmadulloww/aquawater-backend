/*
 * Runs every end-to-end suite against a live deployment.
 *
 * These need a database and real staff accounts, so they are not part of `npm
 * test` and never run in CI on a pull request. They are the pre-release gate:
 *
 *   STAFF_PW=... npm run test:e2e
 *
 * Create the accounts they expect with tests/e2e/fixtures.mjs first.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

if (!process.env.STAFF_PW) {
    console.error('STAFF_PW kerak — tests/e2e/fixtures.mjs ni ishga tushiring.');
    process.exit(1);
}

const suites = readdirSync(here)
    .filter(f => f.endsWith('.mjs') && !['run.mjs', 'fixtures.mjs'].includes(f))
    .sort();

let failed = 0;
for (const suite of suites) {
    process.stdout.write(`\n════ ${suite} ════\n`);
    const r = spawnSync(process.execPath, [join(here, suite)], { stdio: 'inherit' });
    if (r.status !== 0) failed += 1;
}

console.log(failed === 0
    ? `\nBarcha ${suites.length} to'plam o'tdi.`
    : `\n${failed} ta to'plam yiqildi.`);
process.exit(failed === 0 ? 0 : 1);

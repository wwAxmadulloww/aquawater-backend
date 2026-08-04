import mongoose from 'mongoose';

/**
 * Owns the connection to Atlas, including getting it back.
 *
 * The first `mongoose.connect()` used to be the only one there would ever be.
 * Mongoose retries on its own *after* a connection has been established, but a
 * failed opening attempt is terminal: the promise rejects, the error is logged,
 * and nothing tries again. On a host that keeps a warm container alive for a
 * long time, one unlucky cold start — Atlas a second slow, a blip in the
 * network — left that container answering 503 to every request for as long as
 * it lived, while the database itself sat there perfectly healthy. Which is
 * exactly how it failed: twenty minutes of "Ma'lumotlar bazasi vaqtincha mavjud
 * emas" from an instance that was never going to recover on its own.
 */

let uri: string | null = null;
/** Guards against a burst of requests each starting its own dial. */
let dialling = false;

/** Backoff between attempts, so a genuine outage is not hammered. */
const RETRY_MS = [500, 1000, 2000, 5000, 10000];
let attempt = 0;

async function dial(): Promise<void> {
    if (!uri || dialling) return;
    // 1 = connected, 2 = connecting: either way there is nothing to start.
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

    dialling = true;
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        attempt = 0;
        console.log('✅ MongoDB Atlas connected');
    } catch (err) {
        const wait = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
        attempt += 1;
        console.error(`❌ MongoDB connection failed (${(err as Error).message}); retrying in ${wait}ms`);
        setTimeout(() => { void dial(); }, wait).unref?.();
    } finally {
        dialling = false;
    }
}

/** Starts connecting. Safe to call more than once. */
export function initDb(connectionString: string): void {
    uri = connectionString;
    void dial();
}

/**
 * Resolves once the connection is usable, or false on timeout.
 *
 * Serverless containers start cold: mongoose is still dialling Atlas when the
 * first request arrives. Without this, that request sees readyState !== 1 and
 * is rejected even though the connection lands a second later.
 *
 * Readiness is decided by polling readyState rather than by waiting for one
 * named event. An earlier version listened only for 'connected', which covers
 * the very first connect and nothing else: once a container had connected and
 * later dropped, mongoose announced its recovery as 'reconnected', that
 * listener never fired, and every request during the gap fell through to a 503
 * — which is exactly how production behaved, healthy responses interleaved
 * with "Ma'lumotlar bazasi vaqtincha mavjud emas" on the same warm instance.
 *
 * A request arriving while the socket is down also starts a fresh attempt, so
 * ordinary traffic is what revives a stuck container rather than a redeploy.
 */
export function waitForDb(timeoutMs: number): Promise<boolean> {
    if (mongoose.connection.readyState === 1) return Promise.resolve(true);
    if (mongoose.connection.readyState === 0) void dial();

    return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;

        const tick = () => {
            if (mongoose.connection.readyState === 1) return resolve(true);
            if (Date.now() >= deadline) return resolve(false);
            if (mongoose.connection.readyState === 0) void dial();
            setTimeout(tick, 100).unref?.();
        };

        tick();
    });
}

export const isDbReady = (): boolean => mongoose.connection.readyState === 1;

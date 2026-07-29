import mongoose from 'mongoose';

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
 */
export function waitForDb(timeoutMs: number): Promise<boolean> {
    if (mongoose.connection.readyState === 1) return Promise.resolve(true);

    return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;

        const tick = () => {
            if (mongoose.connection.readyState === 1) return resolve(true);
            if (Date.now() >= deadline) return resolve(false);
            setTimeout(tick, 100).unref?.();
        };

        tick();
    });
}

export const isDbReady = (): boolean => mongoose.connection.readyState === 1;

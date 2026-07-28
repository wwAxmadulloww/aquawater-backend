import mongoose from 'mongoose';

/**
 * Resolves once the initial Mongo connection has settled, or false on timeout.
 *
 * Serverless containers start cold: mongoose is still dialling Atlas when the
 * first request arrives. Without this, that request sees readyState !== 1 and
 * is rejected even though the connection lands a second later.
 */
export function waitForDb(timeoutMs: number): Promise<boolean> {
    if (mongoose.connection.readyState === 1) return Promise.resolve(true);

    return new Promise((resolve) => {
        const done = (ok: boolean) => {
            clearTimeout(timer);
            mongoose.connection.off('connected', onConnected);
            resolve(ok);
        };
        const onConnected = () => done(true);
        const timer = setTimeout(() => done(false), timeoutMs);

        mongoose.connection.once('connected', onConnected);
    });
}

export const isDbReady = (): boolean => mongoose.connection.readyState === 1;

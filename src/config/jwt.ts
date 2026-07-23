/**
 * Single source of truth for the JWT signing secret.
 *
 * The previous `process.env.JWT_SECRET || 'secret'` fallback meant a deploy that
 * forgot the env var would happily sign and accept tokens anyone could forge,
 * including tokens for admin accounts.
 */
export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET is not configured');
        }
        return 'dev_only_insecure_secret';
    }

    return secret;
};

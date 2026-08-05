import { Request } from 'express';

/**
 * Page bounds for a list endpoint.
 *
 * Every list was returning its whole collection: the admin order screen asked
 * for every order ever placed, populated each one's customer, and sent the lot
 * down the wire. That is instant on a demo and a function timeout on a real
 * year of trading, so a ceiling is applied whether or not the caller asked for
 * one.
 */
export const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export interface PageParams {
    page: number;
    limit: number;
    skip: number;
}

export function pageParams(req: Request): PageParams {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1
        ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    return { page, limit, skip: (page - 1) * limit };
}

/** The envelope every paginated endpoint answers with. */
export function paged<T>(items: T[], total: number, p: PageParams) {
    return {
        items,
        total,
        page: p.page,
        limit: p.limit,
        pages: Math.max(1, Math.ceil(total / p.limit)),
    };
}

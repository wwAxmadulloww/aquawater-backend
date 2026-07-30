import DeliveryZone from '../models/DeliveryZone';

/**
 * Delivery pricing and coverage.
 *
 * The seed below is applied only when the collection is empty, so it gets a
 * business running without pretending to know its real tariffs — the owner
 * edits them in the admin panel and this never overwrites them again.
 */

const SEED = [
    { region: 'Toshkent shahri', fee: 0, minOrder: 20000, eta: '2-4 soat' },
    { region: 'Toshkent viloyati', fee: 15000, minOrder: 50000, eta: '1 kun' },
];

export async function ensureSeeded(): Promise<void> {
    if (await DeliveryZone.countDocuments()) return;
    await DeliveryZone.insertMany(SEED.map(z => ({ ...z, isActive: true })));
    console.log('[Delivery] Seeded default zones for Tashkent city and region.');
}

export async function activeZones() {
    return DeliveryZone.find({ isActive: true }).sort({ fee: 1, region: 1 }).lean();
}

export type Quote =
    | { ok: true; fee: number; minOrder: number; eta?: string }
    | { ok: false; reason: 'no_zone' | 'below_min'; message: string; minOrder?: number };

/**
 * Prices a delivery to a region, or explains why it cannot be made.
 *
 * A missing zone is a refusal, not free delivery: accepting an order for a
 * region with no courier in it means cancelling on the customer later, which
 * costs more goodwill than declining at checkout.
 */
export async function quote(region: string, itemsTotal: number): Promise<Quote> {
    const zone = await DeliveryZone.findOne({
        region: new RegExp(`^${String(region || '').trim()}$`, 'i'),
        isActive: true,
    }).lean();

    if (!zone) {
        return {
            ok: false,
            reason: 'no_zone',
            message: `Afsuski "${region}" hududiga hozircha yetkazib bermaymiz.`,
        };
    }

    if (itemsTotal < (zone as any).minOrder) {
        return {
            ok: false,
            reason: 'below_min',
            minOrder: (zone as any).minOrder,
            message: `Bu hudud uchun eng kam buyurtma ${(zone as any).minOrder.toLocaleString('ru-RU')} so'm.`,
        };
    }

    return { ok: true, fee: (zone as any).fee, minOrder: (zone as any).minOrder, eta: (zone as any).eta };
}

export const DeliveryService = { ensureSeeded, activeZones, quote };

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth';
import { adminOnly, adminOrSuper } from '../middleware/role';
import DeliveryZone from '../models/DeliveryZone';
import Subscription, { nextOccurrence } from '../models/Subscription';
import Product from '../models/Product';
import Order from '../models/Order';
import { BottleService } from '../services/BottleService';
import { DeliveryService } from '../services/DeliveryService';
import { ReportService } from '../services/ReportService';
import { SubscriptionService } from '../services/SubscriptionService';
import { TelegramBotService } from '../services/TelegramBotService';

const router = Router();

/** Per-customer ceiling on standing orders. */
const MAX_SUBSCRIPTIONS = 10;

// ── Delivery zones ───────────────────────────────────────────────────────

/** Public: the checkout needs to show the fee before anyone is logged in. */
router.get('/delivery-zones', async (_req: Request, res: Response) => {
    res.json(await DeliveryService.activeZones());
});

/** Public: quotes a basket total against a region. */
router.get('/delivery-quote', async (req: Request, res: Response) => {
    const region = String(req.query.region || '');
    const total = Number(req.query.total || 0);
    res.json(await DeliveryService.quote(region, Number.isFinite(total) ? total : 0));
});

const zoneSchema = z.object({
    region: z.string().min(2).max(80),
    fee: z.number().int().min(0).max(1_000_000),
    minOrder: z.number().int().min(0).max(100_000_000),
    eta: z.string().max(40).optional(),
    isActive: z.boolean().optional(),
});

router.post('/delivery-zones', auth, adminOrSuper, async (req: AuthRequest, res: Response) => {
    const parsed = zoneSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0]?.message });
        return;
    }
    try {
        res.status(201).json(await DeliveryZone.create(parsed.data));
    } catch (err: any) {
        // The region is unique: editing an existing one is a PUT, not a POST.
        if (err?.code === 11000) {
            res.status(409).json({ message: 'Bu hudud allaqachon mavjud' });
            return;
        }
        throw err;
    }
});

router.put('/delivery-zones/:id', auth, adminOrSuper, async (req: AuthRequest, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const parsed = zoneSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0]?.message });
        return;
    }
    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!zone) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(zone);
});

router.delete('/delivery-zones/:id', auth, adminOrSuper, async (req: AuthRequest, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    await DeliveryZone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ── Public trust figures ─────────────────────────────────────────────────

/**
 * Checkable facts for the home page: deliveries completed, customers served,
 * and how long the business has been running.
 *
 * Public and deliberately coarse — no order details, no names. Trust in this
 * category comes from numbers a customer could in principle verify, not from
 * adjectives, and a figure the database cannot back is worse than no figure.
 * A count of zero is returned as zero; the page decides not to show it.
 */
router.get('/trust', async (_req: Request, res: Response) => {
    const [delivered, customers, first] = await Promise.all([
        Order.countDocuments({ status: 'delivered' }),
        Order.distinct('userId').then(ids => ids.length),
        Order.findOne().sort({ createdAt: 1 }).select('createdAt').lean(),
    ]);

    res.json({
        delivered,
        customers,
        since: (first as any)?.createdAt ?? null,
    });
});

// ── Returnable containers ────────────────────────────────────────────────

/** A customer's own statement. */
router.get('/bottles/me', auth, async (req: AuthRequest, res: Response) => {
    res.json(await BottleService.statementFor(req.user!._id));
});

/** Everyone holding containers, worst first — the chase list. */
router.get('/bottles/outstanding', auth, adminOnly, async (_req: AuthRequest, res: Response) => {
    const [holders, summary] = await Promise.all([
        BottleService.outstandingHolders(),
        BottleService.depotSummary(),
    ]);
    res.json({ summary, holders });
});

const adjustSchema = z.object({
    userId: z.string().min(1),
    delta: z.number().int().refine(v => v !== 0, 'O\'zgarish nolga teng bo\'lishi mumkin emas'),
    note: z.string().max(300).optional(),
});

/**
 * Manual correction, for containers collected outside a delivery — someone
 * dropping empties at the depot, or a stocktake finding a discrepancy.
 */
router.post('/bottles/adjust', auth, adminOnly, async (req: AuthRequest, res: Response) => {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0]?.message });
        return;
    }
    if (!mongoose.Types.ObjectId.isValid(parsed.data.userId)) {
        res.status(400).json({ message: 'Invalid userId' });
        return;
    }

    await BottleService.record({
        userId: parsed.data.userId,
        delta: parsed.data.delta,
        direction: 'adjustment',
        recordedBy: req.user!._id,
        note: parsed.data.note,
    });

    res.json(await BottleService.statementFor(parsed.data.userId));
});

// ── Subscriptions ────────────────────────────────────────────────────────

const subSchema = z.object({
    items: z.array(z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive().max(100),
        returnBottle: z.boolean().optional().default(true),
    })).min(1).max(20),
    addressSnapshot: z.object({
        region: z.string().min(1), city: z.string().min(1), district: z.string().min(1),
        street: z.string().min(1), house: z.string().min(1), apartment: z.string().optional(),
    }),
    weekday: z.number().int().min(1).max(7),
    deliveryTimeSlot: z.string().min(1),
    paymentMethod: z.enum(['cash', 'click', 'payme']),
});

router.get('/subscriptions', auth, async (req: AuthRequest, res: Response) => {
    res.json(await Subscription.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean());
});

router.post('/subscriptions', auth, async (req: AuthRequest, res: Response) => {
    const parsed = subSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0]?.message });
        return;
    }

    // Validated up front so a standing order cannot be created against a
    // product that no longer exists — it would fail silently every week.
    for (const item of parsed.data.items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)
            || !(await Product.exists({ _id: item.productId }))) {
            res.status(400).json({ message: 'Mahsulot topilmadi' });
            return;
        }
    }

    /*
     * Priced against the real basket, not against zero.
     *
     * Quoting with a zero total made every zone with a minimum look like a
     * failure, so the check was reduced to "does the region exist" — and a
     * standing order below the minimum was accepted, then failed silently every
     * single week with the customer wondering where their water was.
     */
    const priced = await Product.find({ _id: { $in: parsed.data.items.map(i => i.productId) } })
        .select('price')
        .lean();
    const priceById = new Map(priced.map((p: any) => [String(p._id), p.price]));
    const basketTotal = parsed.data.items.reduce(
        (sum, i) => sum + (priceById.get(i.productId) ?? 0) * i.qty, 0);

    const quote = await DeliveryService.quote(parsed.data.addressSnapshot.region, basketTotal);
    if (!quote.ok) {
        res.status(400).json({ message: quote.message });
        return;
    }

    /*
     * A ceiling per customer. Each standing order turns into a real order every
     * week, complete with an operator notification and a Sheets row, so an
     * account creating hundreds of them would flood the people running the
     * business rather than just the database.
     */
    const existing = await Subscription.countDocuments({ userId: req.user!._id });
    if (existing >= MAX_SUBSCRIPTIONS) {
        res.status(429).json({
            message: `Ko'pi bilan ${MAX_SUBSCRIPTIONS} ta doimiy buyurtma bo'lishi mumkin.`,
        });
        return;
    }

    const sub = await Subscription.create({
        ...parsed.data,
        userId: req.user!._id,
        nextRunAt: nextOccurrence(parsed.data.weekday),
    });

    res.status(201).json(sub);
});

router.patch('/subscriptions/:id', auth, async (req: AuthRequest, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }

    // Scoped to the caller: without the userId in the filter, any logged-in
    // customer could pause somebody else's standing order.
    const sub = await Subscription.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!sub) { res.status(404).json({ message: 'Not found' }); return; }

    if (typeof req.body.isActive === 'boolean') {
        sub.isActive = req.body.isActive;
        // Resuming from a pause must not fire immediately for a date in the past.
        if (sub.isActive) sub.nextRunAt = nextOccurrence(sub.weekday);
    }
    if (Number.isInteger(req.body.weekday) && req.body.weekday >= 1 && req.body.weekday <= 7) {
        sub.weekday = req.body.weekday;
        sub.nextRunAt = nextOccurrence(sub.weekday);
    }

    await sub.save();
    res.json(sub);
});

router.delete('/subscriptions/:id', auth, async (req: AuthRequest, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    res.json({ message: 'Deleted' });
});

/**
 * Every standing order in the business, so the owner can see what the scheduler
 * is going to create before it happens rather than being surprised by orders
 * appearing overnight.
 */
router.get('/subscriptions/all', auth, adminOnly, async (_req: AuthRequest, res: Response) => {
    const subs = await Subscription.find()
        .sort({ isActive: -1, nextRunAt: 1 })
        .limit(500)
        .populate('userId', 'name phone')
        .lean();
    res.json(subs);
});

/**
 * Runs the scheduled work now, on an admin's authority.
 *
 * The same job the nightly cron performs. It exists so the owner can see the
 * result immediately instead of waiting until morning to find out whether their
 * standing orders work.
 */
router.post('/subscriptions/run', auth, adminOnly, async (_req: AuthRequest, res: Response) => {
    try {
        res.json(await SubscriptionService.runDueSubscriptions());
    } catch (err: any) {
        console.error('[Subscriptions] Manual run failed:', err);
        await TelegramBotService.alertOperators('Doimiy buyurtmalarni qo\'lda ishga tushirish xato berdi', err?.message);
        res.status(500).json({ message: 'Ishga tushirilmadi' });
    }
});

// ── Reports ──────────────────────────────────────────────────────────────

const range = (req: Request) => ({
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
});

router.get('/reports', auth, adminOnly, async (req: AuthRequest, res: Response) => {
    res.json(await ReportService.fullReport(range(req)));
});

router.get('/reports/export', auth, adminOnly, async (req: AuthRequest, res: Response) => {
    const group = String(req.query.group || 'day');
    const r = range(req);

    const rows = group === 'courier' ? await ReportService.byCourier(r)
        : group === 'product' ? await ReportService.byProduct(r)
        : await ReportService.byDay(r);

    const name = `aquawater-${group}-${r.from || 'boshidan'}-${r.to || 'bugungacha'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(ReportService.toCsv(rows));
});

// ── Scheduler ────────────────────────────────────────────────────────────

/**
 * Runs the standing orders and the reorder nudges.
 *
 * Called by Vercel Cron, which sends no request body and cannot log in, so the
 * gate is a shared secret presented as `Authorization: Bearer $CRON_SECRET`.
 * An admin can also trigger a run from the panel, which authenticates normally.
 */
router.all('/cron/run', async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        res.status(503).json({ message: 'CRON_SECRET is not configured' });
        return;
    }

    /*
     * Header only. A secret in a query string is written into every access log
     * and proxy trace it passes through, and the scheduler sends the header, so
     * accepting `?key=` bought convenience at the price of leaking the key.
     */
    const presented = req.headers.authorization === `Bearer ${secret}`;
    if (!presented) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        const result = await SubscriptionService.runDueSubscriptions();
        if (result.failures.length > 0) {
            await TelegramBotService.alertOperators(
                `${result.failures.length} ta doimiy buyurtma yaratilmadi`,
                result.failures.map(f => `${f.subscriptionId}: ${f.reason}`).join('\n'),
            );
        }
        res.json(result);
    } catch (err: any) {
        console.error('[Cron] Run failed:', err);
        await TelegramBotService.alertOperators('Rejalashtirilgan ish bajarilmadi', err?.message);
        res.status(500).json({ message: 'Cron run failed' });
    }
});

export default router;

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import { AuthRequest } from '../middleware/auth';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

/**
 * Pushes the catalogue to Google Sheets without making the caller wait.
 *
 * Best effort by design: a Sheets outage, or no Sheets configured at all, must
 * never turn a successful product change into a failed request.
 */
const mirrorToSheets = (): void => {
    void GoogleSheetsService.syncAllProducts()
        .catch((err) => console.error('[Product] Sheets mirror failed:', err?.message || err));
};

export const productSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1),
    price: z.number().positive(),
    /*
     * An uploaded photo lives on this site and is referenced by path, so a bare
     * `.url()` — which demands a scheme and a host — rejected every image the
     * shop had put up itself. A single leading slash is required so a
     * protocol-relative "//evil.example" cannot slip through as a path, and
     * anything absolute must be http(s): no javascript: or data: in an src.
     */
    imageUrl: z.string().min(1).max(2000).refine(
        v => (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\//i.test(v),
        'Rasm manzili noto\'g\'ri',
    ),
    inStock: z.boolean().optional().default(true),
    /** True for containers the customer keeps and owes back. */
    returnable: z.boolean().optional(),
    /** Units on hand, or null for anything not counted. */
    stockQty: z.number().int().min(0).max(1_000_000).nullable().optional(),
    /** Charged per unit when the customer keeps a returnable container. */
    depositPrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
});

/**
 * A stocktake sets an absolute figure, not a delta.
 *
 * That is what walking the depot with a clipboard produces, and it is the only
 * operation that can honestly clear the "never counted" state — an increment
 * carries forward whatever error was in the previous number.
 */
export const stocktakeSchema = z.object({
    stockQty: z.number().int().min(0).max(1_000_000).nullable(),
});

export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sort } = req.query;
        const filter: Record<string, unknown> = {};

        let sortObj: Record<string, 1 | -1> = {};
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };
        else sortObj = { createdAt: -1 };

        const products = await Product.find(filter).sort(sortObj);
        res.json(products);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid product id' });
            return;
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        res.json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = productSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const product = await Product.create(parsed.data);

        mirrorToSheets();

        res.status(201).json(product);
    } catch (err) {
        console.error('[Product] createProduct error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const parsed = productSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const product = await Product.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        mirrorToSheets();
        res.json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Records a physical count. Also puts the product back on sale when a count
 * finds units for something that had sold out, since the two always move
 * together and asking an operator to remember both is how they drift apart.
 */
export const stocktake = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const parsed = stocktakeSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: 'Qoldiq soni noto\'g\'ri' });
            return;
        }

        const { stockQty } = parsed.data;
        const update: Record<string, unknown> = {
            stockQty,
            stockCountedAt: new Date(),
        };
        // An untracked product carries no stock claim, so its availability is
        // whatever the operator set by hand and must not be overwritten here.
        if (stockQty !== null) update.inStock = stockQty > 0;

        const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        mirrorToSheets();
        res.json(product);
    } catch (err) {
        console.error('[Product] stocktake error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        /*
         * The photo goes with it. Uploads live in the database, so a catalogue
         * that is edited over years would otherwise accumulate every picture
         * ever attached to a product nobody sells any more.
         */
        const imageId = String(product.imageUrl || '').replace('/api/images/', '');
        if (/^[a-f0-9]{24}$/.test(imageId)) {
            await ProductImage.findByIdAndDelete(imageId)
                .catch(err => console.error('[Product] image cleanup failed:', err?.message));
        }

        mirrorToSheets();
        res.json({ message: 'Product deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminProducts = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

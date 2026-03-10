import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Product from '../models/Product';
import { auth } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const productSchema = z.object({
    name: z.string().min(1).max(100),
    category: z.enum(['water', 'equipment', 'accessories', 'service']),
    productType: z.enum(['product', 'service']).optional(),
    description: z.string().min(1),
    price: z.number().positive(),
    imageUrl: z.string().url(),
    inStock: z.boolean().optional().default(true),
});

// GET /api/products
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, sort } = req.query;
        const filter: Record<string, unknown> = {};
        if (category && ['water', 'equipment', 'accessories', 'service'].includes(category as string)) {
            filter.category = category;
        }

        // If not logged in or is customer, only see approved
        // If worker, see approved + their own pending stuff
        // If admin, see all

        // Wait, since GET / is public right now, we can't easily check req.user if it's not passed through auth middleware.
        // Let's modify this slightly: if we just keep GET / public, we only show approved products.
        // Admins and workers will need a different way to see pending, or we make auth optional here.
        filter.status = 'approved';

        // Or actually, we can check auth header manually, or just use a separate route for admin/worker to get all/pending.
        // To keep it simple without changing the public nature of GET /, we'll just force status = 'approved' for public.

        let sortObj: Record<string, 1 | -1> = {};
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };
        else sortObj = { createdAt: -1 };

        const products = await Product.find(filter).sort(sortObj);
        res.json(products);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        res.json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/products 
// We will allow workers to post as well, so we need to change adminOnly to allow workers.
// But wait, the prompt says "admin bularga rol berganda... ishchi ozi qosha olishi kerak".
// Let's create a custom middleware or just check in the route.
export const adminOrWorker = (req: AuthRequest, res: Response, next: import('express').NextFunction): void => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'worker' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Admin, Super Admin or Worker access required' });
        return;
    }
    next();
};

router.post('/', auth, adminOrWorker, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = productSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const data: any = { ...parsed.data };

        if (req.user?.role === 'worker') {
            data.status = 'pending';
            data.workerId = req.user._id as any;
            data.category = 'service'; // Force as service
            data.productType = 'service';
        } else {
            // Admin can create anything, default is approved
            data.status = 'approved';
        }

        const product = await Product.create(data);
        res.status(201).json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/products/:id (admin)
router.put('/:id', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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
        res.json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        res.json({ message: 'Product deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/products/admin/all (admin/worker specific)
router.get('/admin/all', auth, adminOrWorker, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filter: any = {};
        if (req.user?.role === 'worker') {
            filter.workerId = req.user._id;
        }
        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/products/:id/approve (admin)
router.patch('/:id/approve', auth, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const product = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        res.json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

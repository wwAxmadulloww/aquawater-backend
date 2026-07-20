import { Request, Response } from 'express';
import { z } from 'zod';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

export const productSchema = z.object({
    name: z.string().min(1).max(100),
    category: z.enum(['water', 'equipment', 'accessories', 'service']),
    productType: z.enum(['product', 'service']).optional(),
    description: z.string().min(1),
    price: z.number().positive(),
    imageUrl: z.string().url(),
    inStock: z.boolean().optional().default(true),
});

export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, sort } = req.query;
        const filter: Record<string, unknown> = {};
        if (category && ['water', 'equipment', 'accessories', 'service'].includes(category as string)) {
            filter.category = category;
        }

        filter.status = 'approved';

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

        const data: any = { ...parsed.data };

        if (req.user?.role === 'worker') {
            data.status = 'pending';
            data.workerId = req.user._id;
            data.category = 'service';
            data.productType = 'service';
        } else {
            data.status = 'approved';
        }

        const product = await Product.create(data);
        await GoogleSheetsService.syncProduct(product);
        res.status(201).json(product);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
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
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
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
};

export const getAdminProducts = async (req: AuthRequest, res: Response): Promise<void> => {
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
};

export const approveProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
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
};

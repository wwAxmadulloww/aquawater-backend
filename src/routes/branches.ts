import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Branch from '../models/Branch';
import { auth } from '../middleware/auth';
import { adminOrSuper } from '../middleware/role';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const branchSchema = z.object({
    name: z.string().min(1).max(100),
    address: z.string().min(1),
    phone: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    workingHours: z.string().min(1),
    isActive: z.boolean().optional().default(true),
    deliveryZone: z.string().optional(),
    description: z.string().optional(),
});

// GET /api/branches (Public)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
        res.json(branches);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/branches/admin/all (Admin/SuperAdmin only)
router.get('/admin/all', auth, adminOrSuper, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.json(branches);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/branches/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/branches (Admin/SuperAdmin only)
router.post('/', auth, adminOrSuper, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = branchSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const branch = await Branch.create(parsed.data);
        res.status(201).json(branch);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/branches/:id (Admin/SuperAdmin only)
router.put('/:id', auth, adminOrSuper, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = branchSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }

        const branch = await Branch.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/branches/:id (Admin/SuperAdmin only)
router.delete('/:id', auth, adminOrSuper, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json({ message: 'Branch deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

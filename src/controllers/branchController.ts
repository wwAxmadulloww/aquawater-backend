import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Branch from '../models/Branch';
import { AuthRequest } from '../middleware/auth';

export const branchSchema = z.object({
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

export const getBranches = async (_req: Request, res: Response): Promise<void> => {
    try {
        const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
        res.json(branches);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminBranches = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.json(branches);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBranchById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
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
};

export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

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
};

export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: 'Invalid id' });
            return;
        }

        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json({ message: 'Branch deleted' });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
};

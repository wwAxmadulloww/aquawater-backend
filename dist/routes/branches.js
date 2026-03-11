"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Branch_1 = __importDefault(require("../models/Branch"));
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
const branchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    address: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(1),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    workingHours: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean().optional().default(true),
    deliveryZone: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// GET /api/branches (Public)
router.get('/', async (_req, res) => {
    try {
        const branches = await Branch_1.default.find({ isActive: true }).sort({ name: 1 });
        res.json(branches);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/branches/admin/all (Admin/SuperAdmin only)
router.get('/admin/all', auth_1.auth, role_1.adminOrSuper, async (_req, res) => {
    try {
        const branches = await Branch_1.default.find().sort({ createdAt: -1 });
        res.json(branches);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/branches/:id
router.get('/:id', async (req, res) => {
    try {
        const branch = await Branch_1.default.findById(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// POST /api/branches (Admin/SuperAdmin only)
router.post('/', auth_1.auth, role_1.adminOrSuper, async (req, res) => {
    try {
        const parsed = branchSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const branch = await Branch_1.default.create(parsed.data);
        res.status(201).json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// PUT /api/branches/:id (Admin/SuperAdmin only)
router.put('/:id', auth_1.auth, role_1.adminOrSuper, async (req, res) => {
    try {
        const parsed = branchSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ errors: parsed.error.errors });
            return;
        }
        const branch = await Branch_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// DELETE /api/branches/:id (Admin/SuperAdmin only)
router.delete('/:id', auth_1.auth, role_1.adminOrSuper, async (req, res) => {
    try {
        const branch = await Branch_1.default.findByIdAndDelete(req.params.id);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json({ message: 'Branch deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;

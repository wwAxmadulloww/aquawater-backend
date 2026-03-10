import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};

export const superAdminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'super_admin') {
        res.status(403).json({ message: 'Super Admin access required' });
        return;
    }
    next();
};

export const adminOrSuper = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Restricted access' });
        return;
    }
    next();
};

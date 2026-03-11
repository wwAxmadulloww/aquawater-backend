"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOrSuper = exports.superAdminOnly = exports.adminOnly = void 0;
const adminOnly = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
exports.adminOnly = adminOnly;
const superAdminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'super_admin') {
        res.status(403).json({ message: 'Super Admin access required' });
        return;
    }
    next();
};
exports.superAdminOnly = superAdminOnly;
const adminOrSuper = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Restricted access' });
        return;
    }
    next();
};
exports.adminOrSuper = adminOrSuper;

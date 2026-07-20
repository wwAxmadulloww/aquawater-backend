import { Router, Response, NextFunction } from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import * as productController from '../controllers/productController';

const router = Router();

export const adminOrWorker = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'worker' && req.user.role !== 'super_admin')) {
        res.status(403).json({ message: 'Admin, Super Admin or Worker access required' });
        return;
    }
    next();
};

router.get('/', productController.getProducts);
router.get('/admin/all', auth, adminOrWorker, productController.getAdminProducts);
router.get('/:id', productController.getProductById);
router.post('/', auth, adminOrWorker, productController.createProduct);
router.put('/:id', auth, adminOnly, productController.updateProduct);
router.delete('/:id', auth, adminOnly, productController.deleteProduct);
router.patch('/:id/approve', auth, adminOnly, productController.approveProduct);

export default router;

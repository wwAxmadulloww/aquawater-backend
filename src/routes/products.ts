import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import * as productController from '../controllers/productController';

/**
 * The catalogue.
 *
 * Every write is admin-only. There used to be an `adminOrWorker` gate here and
 * an `/approve` route behind it, because a fitter could submit a service of
 * their own for an admin to vet. With only water on sale, everything in the
 * catalogue is put there by the shop itself, so there is nothing to approve.
 */
const router = Router();

router.get('/', productController.getProducts);
router.get('/admin/all', auth, adminOnly, productController.getAdminProducts);
router.get('/:id', productController.getProductById);
router.post('/', auth, adminOnly, productController.createProduct);
router.put('/:id', auth, adminOnly, productController.updateProduct);
router.delete('/:id', auth, adminOnly, productController.deleteProduct);
router.patch('/:id/stocktake', auth, adminOnly, productController.stocktake);

export default router;

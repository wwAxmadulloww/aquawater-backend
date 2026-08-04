import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import * as productController from '../controllers/productController';
import { uploadProductImage } from '../controllers/imageController';
import express from 'express';

/**
 * The catalogue.
 *
 * Every write is admin-only. There used to be an `adminOrWorker` gate here and
 * an `/approve` route behind it, because a fitter could submit a service of
 * their own for an admin to vet. With only water on sale, everything in the
 * catalogue is put there by the shop itself, so there is nothing to approve.
 */
const router = Router();

/*
 * The photo arrives as raw bytes rather than a multipart form: the browser has
 * already shrunk it to a single blob, so there is nothing to separate out, and
 * express parses this on its own without another dependency in the tree.
 */
router.post(
    '/image',
    auth,
    adminOnly,
    express.raw({ type: ['image/*', 'application/octet-stream'], limit: '4mb' }),
    uploadProductImage,
);

router.get('/', productController.getProducts);
router.get('/admin/all', auth, adminOnly, productController.getAdminProducts);
router.get('/:id', productController.getProductById);
router.post('/', auth, adminOnly, productController.createProduct);
router.put('/:id', auth, adminOnly, productController.updateProduct);
router.delete('/:id', auth, adminOnly, productController.deleteProduct);
router.patch('/:id/stocktake', auth, adminOnly, productController.stocktake);

export default router;

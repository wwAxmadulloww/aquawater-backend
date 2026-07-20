import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import * as orderController from '../controllers/orderController';

const router = Router();

router.post('/', auth, orderController.createOrder);
router.get('/', auth, orderController.getOrders);
router.get('/:id', auth, orderController.getOrderById);
router.patch('/:id/status', auth, orderController.updateOrderStatus);
router.delete('/:id', auth, adminOnly, orderController.deleteOrder);
router.patch('/:id/assign', auth, adminOnly, orderController.assignOrder);

export default router;

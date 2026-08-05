import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth';
import { adminOnly } from '../middleware/role';
import * as orderController from '../controllers/orderController';

const router = Router();

/**
 * Order creation was the one write on the site with no ceiling at all.
 * A logged-in account could post orders in a loop, and each one fans out to a
 * Telegram notification and a Google Sheets row — so the flood lands on the
 * operators, not just the database.
 *
 * Keyed by account rather than by IP: a household or an office behind one NAT
 * address is a completely normal way for several real customers to arrive.
 */
const createOrderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => String(req.user?._id || req.ip),
    message: { message: 'Juda ko\'p buyurtma yuborildi. Birozdan so\'ng urinib ko\'ring.' },
});

router.post('/', auth, createOrderLimiter, orderController.createOrder);
router.get('/', auth, orderController.getOrders);
router.get('/:id', auth, orderController.getOrderById);
router.patch('/:id/status', auth, orderController.updateOrderStatus);
router.delete('/:id', auth, adminOnly, orderController.deleteOrder);
router.patch('/:id/assign', auth, adminOnly, orderController.assignOrder);
router.patch('/:id/cancel', auth, orderController.cancelOwnOrder);
router.post('/cash/settle', auth, adminOnly, orderController.settleCash);

export default router;

import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminOnly, adminOrSuper, superAdminOnly } from '../middleware/role';
import * as adminController from '../controllers/adminController';

const router = Router();

router.get('/stats', auth, adminOnly, adminController.getStats);
router.get('/users', auth, adminOnly, adminController.getUsers);
router.patch('/users/:id/role', auth, adminOrSuper, adminController.updateUserRole);
router.delete('/users/:id', auth, superAdminOnly, adminController.deleteUser);

export default router;

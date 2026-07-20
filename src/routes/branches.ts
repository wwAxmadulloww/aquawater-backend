import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminOrSuper } from '../middleware/role';
import * as branchController from '../controllers/branchController';

const router = Router();

router.get('/', branchController.getBranches);
router.get('/admin/all', auth, adminOrSuper, branchController.getAdminBranches);
router.get('/:id', branchController.getBranchById);
router.post('/', auth, adminOrSuper, branchController.createBranch);
router.put('/:id', auth, adminOrSuper, branchController.updateBranch);
router.delete('/:id', auth, adminOrSuper, branchController.deleteBranch);

export default router;

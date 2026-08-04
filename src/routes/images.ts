import { Router } from 'express';
import { getProductImage } from '../controllers/imageController';

/**
 * Public, because product photos have to render for a visitor who has not
 * logged in. Read-only: uploading goes through the admin-gated product route.
 */
const router = Router();

router.get('/:id', getProductImage);

export default router;

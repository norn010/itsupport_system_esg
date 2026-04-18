import { Router } from 'express';
import { getRackPhotos, createRackPhoto } from '../controllers/rackPhotos.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getRackPhotos);
router.post('/', authenticate, createRackPhoto);

export default router;

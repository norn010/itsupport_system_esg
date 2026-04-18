import { Router } from 'express';
import { getLocations, createLocation } from '../controllers/locations.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getLocations);
router.post('/', authenticate, createLocation);

export default router;

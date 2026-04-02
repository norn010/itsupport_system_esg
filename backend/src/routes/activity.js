import { Router } from 'express';
import { getTicketActivity } from '../controllers/activity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:ticketId/activity', authenticate, requireRole('IT', 'MANAGER'), getTicketActivity);

export default router;

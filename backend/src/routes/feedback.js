import { Router } from 'express';
import { submitFeedback } from '../controllers/feedback.js';

const router = Router();

// Public route requiring no auth, just the ticket ID
router.post('/:ticketId/feedback', submitFeedback);

export default router;

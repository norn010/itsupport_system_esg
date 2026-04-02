import { Router } from 'express';
import { getMessages, createMessage, upload } from '../controllers/chat.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:id/messages', authenticate, requireRole('IT', 'MANAGER'), getMessages);
router.post('/:id/messages', upload.single('image'), createMessage);

export default router;

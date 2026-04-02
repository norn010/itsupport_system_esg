import { Router } from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/notes.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Only IT and Manager can access ticket internal notes
router.get('/:ticketId/notes', authenticate, requireRole('IT', 'MANAGER'), getNotes);
router.post('/:ticketId/notes', authenticate, requireRole('IT', 'MANAGER'), createNote);
router.delete('/:ticketId/notes/:id', authenticate, requireRole('IT', 'MANAGER'), deleteNote);

export default router;

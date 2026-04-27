import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  deletePrinter
} from '../controllers/printers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

router.get('/', getPrinters);
router.get('/:id', getPrinterById);
router.post('/', createPrinter);
router.put('/:id', updatePrinter);
router.delete('/:id', requireRole('MANAGER'), deletePrinter);

export default router;

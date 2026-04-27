import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getPrinterLogs,
  getPrinterLogById,
  createPrinterLog,
  updatePrinterLog,
  deletePrinterLog
} from '../controllers/printerLogs.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

router.get('/', getPrinterLogs);
router.get('/:id', getPrinterLogById);
router.post('/', createPrinterLog);
router.put('/:id', updatePrinterLog);
router.delete('/:id', requireRole('MANAGER'), deletePrinterLog);

export default router;

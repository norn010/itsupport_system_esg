import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createInventoryItem, getInventoryItems, updateInventoryItem, deleteInventoryItem, getLowStock
} from '../controllers/inventory.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

router.get('/', getInventoryItems);
router.get('/low-stock', getLowStock);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', requireRole('MANAGER'), deleteInventoryItem);

export default router;

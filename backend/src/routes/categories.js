import { Router } from 'express';
import { getCategories, getSubcategories } from '../controllers/categories.js';

const router = Router();

// Public routes for dropdowns
router.get('/', getCategories);
router.get('/:categoryId/subcategories', getSubcategories);

export default router;

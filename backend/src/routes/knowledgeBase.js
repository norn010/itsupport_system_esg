import { Router } from 'express';
import { getArticles, getArticleBySlug, createArticle, updateArticle, deleteArticle } from '../controllers/knowledgeBase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getArticles);
router.get('/slug/:slug', getArticleBySlug);

// Admin routes (IT, MANAGER)
router.post('/', authenticate, requireRole('IT', 'MANAGER'), createArticle);
router.put('/:id', authenticate, requireRole('IT', 'MANAGER'), updateArticle);
router.delete('/:id', authenticate, requireRole('IT', 'MANAGER'), deleteArticle);

export default router;

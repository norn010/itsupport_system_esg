import { Router } from 'express';
import { getUsers, createUser, deleteUser } from '../controllers/users.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getUsers);
router.post('/', authenticate, createUser);
router.delete('/:id', authenticate, deleteUser);

export default router;

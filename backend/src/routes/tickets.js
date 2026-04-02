import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  getITStaff,
  getStats,
  exportTicketsExcel,
  getDepartments,
} from '../controllers/tickets.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
});

const router = Router();

const createTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many tickets created from this IP, please try again after 15 minutes'
});

// Public routes
router.post('/', createTicketLimiter, upload.array('images', 5), createTicket);
router.get('/departments', getDepartments);
router.get('/search/:id', getTicketById);
router.get('/', getTickets);

// Protected routes
router.get('/export/excel', authenticate, requireRole('MANAGER', 'IT'), exportTicketsExcel);
router.get('/stats/dashboard', authenticate, requireRole('MANAGER', 'IT'), getStats);
router.get('/staff/it', authenticate, requireRole('IT', 'MANAGER'), getITStaff);
router.get('/:id', authenticate, requireRole('IT', 'MANAGER'), getTicketById);
router.patch('/:id', authenticate, requireRole('IT', 'MANAGER'), updateTicket);

export default router;

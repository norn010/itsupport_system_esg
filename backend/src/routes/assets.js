import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createAsset, getAssets, getAssetById, updateAsset, deleteAsset,
  assignAsset, returnAsset,
  createMaintenance, updateMaintenance,
  getAssetHistory,
  getAssetCategories, getAssetSubcategories,
  getVendors, createVendor,
  getLocations,
  getAssetStats
} from '../controllers/assets.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/assets/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `asset-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

// Lookups
router.get('/categories', getAssetCategories);
router.get('/categories/:categoryId/subcategories', getAssetSubcategories);
router.get('/vendors', getVendors);
router.post('/vendors', requireRole('MANAGER'), createVendor);
router.get('/locations', getLocations);

// Dashboard stats (Manager/IT)
router.get('/stats/dashboard', getAssetStats);

// CRUD
router.get('/', getAssets);
router.post('/', upload.single('image'), createAsset);
router.get('/:id', getAssetById);
router.put('/:id', upload.single('image'), updateAsset);
router.delete('/:id', requireRole('MANAGER'), deleteAsset);

// Assignment
router.post('/:id/assign', assignAsset);
router.post('/:id/return', returnAsset);

// Maintenance
router.post('/:id/maintenance', createMaintenance);
router.patch('/maintenance/:maintenanceId', updateMaintenance);

// History / Audit Log
router.get('/:id/history', getAssetHistory);

export default router;

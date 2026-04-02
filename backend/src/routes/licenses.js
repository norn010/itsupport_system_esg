import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createLicense, getLicenses, getLicenseById, updateLicense, deleteLicense,
  assignLicense, revokeLicense, getExpiringLicenses
} from '../controllers/licenses.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('IT', 'MANAGER'));

router.get('/', getLicenses);
router.get('/expiring', getExpiringLicenses);
router.post('/', createLicense);
router.get('/:id', getLicenseById);
router.put('/:id', updateLicense);
router.delete('/:id', requireRole('MANAGER'), deleteLicense);

router.post('/assign', assignLicense);
router.post('/revoke/:assignmentId', revokeLicense);

export default router;

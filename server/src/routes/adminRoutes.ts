import express from 'express';
import {
  createSubAdmin,
  getAllSubAdmins,
  updateSubAdminPincodes,
  getGovernanceStats,
} from '../controllers/adminController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Super-Admin protected routes
router.post('/subadmins', protect, authorize('superadmin'), createSubAdmin);
router.get('/subadmins', protect, authorize('superadmin'), getAllSubAdmins);
router.put('/subadmins/:id/pincodes', protect, authorize('superadmin'), updateSubAdminPincodes);
router.get('/stats', protect, authorize('superadmin', 'subadmin'), getGovernanceStats);

export default router;

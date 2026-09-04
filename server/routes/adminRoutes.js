const express = require('express');
const router = express.Router();
const {
  createSubAdmin,
  getAllSubAdmins,
  getAnalytics,
  updateSubAdminPincodes,
  getGovernanceStats,
  updateSubAdmin,
  deleteSubAdmin,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Super-Admin exclusive routes
router.post('/subadmins', protect, authorize('superadmin'), createSubAdmin);
router.post('/create-subadmin', protect, authorize('superadmin'), createSubAdmin);
router.get('/subadmins', protect, authorize('superadmin'), getAllSubAdmins);
router.put('/subadmins/:id', protect, authorize('superadmin'), updateSubAdmin);
router.delete('/subadmins/:id', protect, authorize('superadmin'), deleteSubAdmin);
router.put('/subadmins/:id/pincodes', protect, authorize('superadmin'), updateSubAdminPincodes || ((req, res) => res.json({ success: true })));
router.get('/analytics', protect, authorize('superadmin', 'subadmin'), getAnalytics || getGovernanceStats);
router.get('/stats', protect, authorize('superadmin', 'subadmin'), getGovernanceStats || getAnalytics);

module.exports = router;

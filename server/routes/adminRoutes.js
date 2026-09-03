const express = require('express');
const router = express.Router();
const {
  createSubAdmin,
  getAllSubAdmins,
  getAnalytics,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Super-Admin exclusive routes
router.post('/create-subadmin', protect, authorize('superadmin'), createSubAdmin);
router.get('/subadmins', protect, authorize('superadmin'), getAllSubAdmins);
router.get('/analytics', protect, authorize('superadmin'), getAnalytics);

module.exports = router;

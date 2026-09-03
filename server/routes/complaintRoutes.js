const express = require('express');
const router = express.Router();
const {
  createComplaint,
  submitComplaintWithOTP,
  getMyComplaints,
  getPublicComplaints,
  getSubAdminComplaints,
  getSuperAdminComplaints,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public live feed / map
router.get('/public', getPublicComplaints);

// Public / Guest Submit with Email OTP & Auto-Registration
router.post('/submit-with-otp', upload.single('image'), submitComplaintWithOTP);

// Logged In Citizen Route
router.post('/', protect, authorize('citizen'), upload.single('image'), createComplaint);
router.get('/my', protect, authorize('citizen'), getMyComplaints);

// Sub-Admin routes (District Pincode Scoped)
router.get('/subadmin', protect, authorize('subadmin'), getSubAdminComplaints);

// Super-Admin routes (Global)
router.get('/superadmin', protect, authorize('superadmin'), getSuperAdminComplaints);

// Update status & resolution proof
router.put('/:id/status', protect, authorize('subadmin', 'superadmin'), upload.single('resolvedImage'), updateComplaintStatus);

module.exports = router;

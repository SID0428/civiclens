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
  analyzeComplaintImage,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public live feed
router.get('/public', getPublicComplaints);

// Groq AI Vision Image Analysis Route
router.post('/analyze-image', upload.single('image'), analyzeComplaintImage);

// Public / Guest Submit with Email OTP & Geotagged Photos
router.post('/submit-with-otp', upload.array('images', 5), submitComplaintWithOTP);

// Logged In Citizen Routes
router.post('/', protect, authorize('citizen'), upload.array('images', 5), createComplaint);
router.get('/my', protect, authorize('citizen'), getMyComplaints);

// Sub-Admin Routes
router.get('/subadmin', protect, authorize('subadmin', 'superadmin'), getSubAdminComplaints);

// Super-Admin Routes
router.get('/superadmin', protect, authorize('superadmin'), getSuperAdminComplaints);

// Update status & resolution proof
router.put('/:id/status', protect, authorize('subadmin', 'superadmin'), upload.single('resolvedImage'), updateComplaintStatus);

module.exports = router;

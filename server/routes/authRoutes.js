const express = require('express');
const router = express.Router();
const {
  sendRegistrationOTP,
  registerWithOTP,
  userLogin,
  googleAuth,
  adminLogin,
  superAdminLogin,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Citizen Auth
router.post('/send-otp', sendRegistrationOTP);
router.post('/register-with-otp', registerWithOTP);
router.post('/user-login', userLogin);
router.post('/google', googleAuth);

// Admin Auth
router.post('/admin-login', adminLogin);
router.post('/superadmin-login', superAdminLogin);

// Current User Profile
router.get('/me', protect, getMe);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  sendEmailOTP,
  sendRegistrationOTP,
  verifyOTP,
  verifyOTPAndSignup,
  registerWithOTP,
  loginWithPassword,
  userLogin,
  adminLogin,
  superAdminLogin,
  googleAuth,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Standard & Legacy OTP routes
router.post('/send-otp', sendEmailOTP || sendRegistrationOTP);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp-signup', verifyOTPAndSignup || registerWithOTP);
router.post('/register-with-otp', registerWithOTP || verifyOTPAndSignup);

// Login routes
router.post('/login', loginWithPassword || userLogin);
router.post('/user-login', userLogin || loginWithPassword);
router.post('/admin-login', adminLogin || loginWithPassword);
router.post('/superadmin-login', superAdminLogin || loginWithPassword);

// Google OAuth
router.post('/google', googleAuth);

// Current User Profile
router.get('/me', protect, getMe);

module.exports = router;

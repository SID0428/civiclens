import express from 'express';
import {
  sendEmailOTP,
  verifyOTP,
  verifyOTPAndSignup,
  loginWithPassword,
  googleAuth,
  getMe,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send-otp', sendEmailOTP);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp-signup', verifyOTPAndSignup);
router.post('/login', loginWithPassword);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);

export default router;

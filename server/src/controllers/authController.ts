import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { sendOTPEmail } from '../config/nodemailer';
import { AuthRequest, UserRole } from '../types';

const generateToken = (id: string, role: UserRole): string => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih',
    { expiresIn: '7d' }
  );
};

const generate6DigitOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    1. Send Email OTP (Google SMTP)
// @route   POST /api/auth/send-otp
export const sendEmailOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose = 'Verification' } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const isLogin = purpose.toLowerCase().includes('login');
    let user = await User.findOne({ email });

    if (isLogin) {
      if (!user || !user.isEmailVerified) {
        res.status(404).json({
          success: false,
          message: 'No verified citizen account found with this email. Please sign up first.',
        });
        return;
      }
    } else {
      if (!user) {
        user = new User({
          name: email.split('@')[0],
          email,
          role: 'citizen',
          isEmailVerified: false,
        });
      }
    }

    const otpCode = generate6DigitOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = {
      code: otpCode,
      expiresAt,
      purpose,
    };

    await user.save();

    const emailUser = (process.env.EMAIL_USER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    const isConfigured = emailUser &&
                         emailPass &&
                         !emailUser.includes('your_') &&
                         !emailPass.includes('your_') &&
                         !emailPass.includes('xxxx');

    const sent = await sendOTPEmail(email, otpCode, purpose);

    res.status(200).json({
      success: true,
      message: `Verification OTP dispatched to ${email}`,
      devOtp: (!isConfigured || !sent || process.env.NODE_ENV !== 'production') ? otpCode : undefined,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    Verify OTP for Login
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required.' });
      return;
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otp.code) {
      res.status(400).json({ success: false, message: 'No OTP generated for this email.' });
      return;
    }

    if (new Date() > new Date(user.otp.expiresAt || 0)) {
      res.status(400).json({ success: false, message: 'OTP has expired.' });
      return;
    }

    if (user.otp.code !== otp.trim()) {
      res.status(400).json({ success: false, message: 'Invalid 6-digit OTP.' });
      return;
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        assignedPincodes: user.assignedPincodes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    2. Verify OTP & Complete Citizen Signup
// @route   POST /api/auth/verify-otp-signup
export const verifyOTPAndSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, otp, phone, password } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required.' });
      return;
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otp.code) {
      res.status(400).json({ success: false, message: 'No OTP generated for this email. Please request OTP first.' });
      return;
    }

    if (new Date() > new Date(user.otp.expiresAt || 0)) {
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      return;
    }

    if (user.otp.code !== otp.trim()) {
      res.status(400).json({ success: false, message: 'Invalid 6-digit OTP.' });
      return;
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (password) user.password = password;
    user.isEmailVerified = true;
    user.otp = undefined;

    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: 'Email successfully verified and citizen account active!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    3. Login With Password (Citizen, SubAdmin, SuperAdmin)
// @route   POST /api/auth/login
export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide email and password.' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        assignedPincodes: user.assignedPincodes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    4. Google OAuth Callback
// @route   POST /api/auth/google
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Google account email is required.' });
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar,
        isEmailVerified: true,
        role: 'citizen',
      });
    } else {
      if (googleId) user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    5. Get Current Logged-In User Profile
// @route   GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

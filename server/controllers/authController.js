const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail } = require('../config/nodemailer');

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih',
    { expiresIn: '7d' }
  );
};

const generate6DigitOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Send OTP Email (Supports sendEmailOTP and sendRegistrationOTP)
const sendEmailOTP = async (req, res) => {
  try {
    const { email, purpose = 'Verification' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const purposeLower = purpose.toLowerCase();
    const isLogin = purposeLower.includes('login');
    const isSignup = purposeLower.includes('signup') || purposeLower.includes('registration');

    let user = await User.findOne({ email });

    if (isLogin) {
      if (!user || !user.isEmailVerified) {
        return res.status(404).json({
          success: false,
          message: 'No registered account found with this email. Please sign up first.',
        });
      }
    } else if (isSignup) {
      if (user && user.isEmailVerified && user.password) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please log in instead.',
        });
      }
      if (!user) {
        user = new User({
          name: email.split('@')[0],
          email,
          role: 'citizen',
          isEmailVerified: false,
        });
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = { code: otpCode, expiresAt, purpose };
    await user.save();

    const mailResult = await sendOTPEmail(email, otpCode, purpose);
    const showDevOtp = mailResult?.devMode && process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: `Verification OTP sent to ${email}. Please check your email inbox and spam folder.`,
      devOtp: showDevOtp ? otpCode : undefined,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch verification OTP' });
  }
};

// 2. Verify OTP for Login
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'No OTP generated for this email.' });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit OTP.' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);

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
        assignedDistrict: user.assignedDistrict,
        assignedPincodes: user.assignedPincodes,
        officialId: user.officialId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Verify OTP & Citizen Signup
const verifyOTPAndSignup = async (req, res) => {
  try {
    const { name, email, otp, phone, password } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'No OTP generated for this email.' });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    if (user.otp.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit OTP.' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (password) user.password = password;
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Email successfully verified!',
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Login with Password (Handles citizen, subadmin, superadmin)
const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        assignedDistrict: user.assignedDistrict,
        assignedPincodes: user.assignedPincodes,
        officialId: user.officialId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { OAuth2Client } = require('google-auth-library');

// 4. Google Auth
const googleAuth = async (req, res) => {
  try {
    let { email, name, googleId, avatar, credential } = req.body;

    if (credential) {
      try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
        if (googleClientId && !googleClientId.includes('your_')) {
          const client = new OAuth2Client(googleClientId);
          const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
          });
          const payload = ticket.getPayload();
          if (payload) {
            email = payload.email || email;
            name = payload.name || name;
            googleId = payload.sub || googleId;
            avatar = payload.picture || avatar;
          }
        } else {
          const decoded = jwt.decode(credential);
          if (decoded) {
            email = decoded.email || email;
            name = decoded.name || name;
            googleId = decoded.sub || googleId;
            avatar = decoded.picture || avatar;
          }
        }
      } catch (err) {
        console.warn('[Google OAuth Token Verification Warning]:', err.message);
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required for Google login.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
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

    const token = generateToken(user._id, user.role);

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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Current User Profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendEmailOTP,
  sendRegistrationOTP: sendEmailOTP,
  verifyOTP,
  verifyOTPAndSignup,
  registerWithOTP: verifyOTPAndSignup,
  loginWithPassword,
  userLogin: loginWithPassword,
  adminLogin: loginWithPassword,
  superAdminLogin: loginWithPassword,
  googleAuth,
  getMe,
};

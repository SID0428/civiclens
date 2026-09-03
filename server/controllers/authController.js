const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendOTPEmail } = require('../config/nodemailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    1. Citizen Send Registration OTP (via Google SMTP)
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email, purpose = 'Signup' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    // Check if user already exists when signing up
    const existingUser = await User.findOne({ email });
    if (purpose === 'Signup' && existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = existingUser;
    if (!user) {
      user = new User({
        name: email.split('@')[0],
        email,
        role: 'citizen',
        isEmailVerified: false,
      });
    }

    user.otp = {
      code: otpCode,
      expiresAt: otpExpires,
    };
    await user.save();

    // Send email via Google SMTP
    const mailResult = await sendOTPEmail(email, otpCode, purpose);

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${email}`,
      devOtp: mailResult.devMode ? otpCode : undefined, // helpful for testing during dev
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error sending OTP' });
  }
};

// @desc    2. Citizen Signup / Verify OTP & Register
// @route   POST /api/auth/register-with-otp
// @access  Public
exports.registerWithOTP = async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email. Please request a new OTP.' });
    }

    // Check OTP expiration
    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check OTP match
    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    // Update user details
    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (password) user.password = password;
    user.isEmailVerified = true;
    user.otp = undefined; // clear OTP
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created and verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Register OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    3. Citizen Standard Login (Email & Password)
// @route   POST /api/auth/user-login
// @access  Public
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'This portal is for citizens. Admins must use their respective portals.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    4. Google OAuth Sign-In / Sign-Up
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { credential, userInfo } = req.body;

    let email, name, avatar, googleId;

    if (credential) {
      // Decode or verify Google ID Token
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        avatar = payload.picture;
        googleId = payload.sub;
      } catch (e) {
        // Fallback for direct token payload or simulated OAuth in dev
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name || 'Citizen User';
          avatar = decoded.picture || '';
          googleId = decoded.sub;
        } else {
          throw new Error('Invalid Google credential token');
        }
      }
    } else if (userInfo) {
      email = userInfo.email;
      name = userInfo.name;
      avatar = userInfo.picture;
      googleId = userInfo.id || userInfo.sub;
    } else {
      return res.status(400).json({ success: false, message: 'Google authentication data missing' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Unable to extract email from Google profile' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        role: 'citizen',
        isEmailVerified: true,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar) user.avatar = avatar;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Google authentication failed' });
  }
};

// @desc    5. Sub-Admin (District Officer) Login
// @route   POST /api/auth/admin-login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password, officialId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const query = { email };
    if (officialId) {
      query.officialId = officialId;
    }

    const admin = await User.findOne(query).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or Official ID' });
    }

    if (admin.role !== 'subadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only authorized District Sub-Admins can log in here.',
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      success: true,
      message: 'Sub-Admin authenticated successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        assignedDistrict: admin.assignedDistrict,
        assignedPincodes: admin.assignedPincodes,
        officialId: admin.officialId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    6. Super-Admin Master Login
// @route   POST /api/auth/superadmin-login
// @access  Public
exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password, masterKey } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Verify master key if supplied
    const systemMasterKey = process.env.SUPERADMIN_SECRET_KEY || 'CIVICLENS_SUPER_ADMIN_MASTER_KEY_2026';
    if (masterKey && masterKey !== systemMasterKey) {
      return res.status(401).json({ success: false, message: 'Invalid Super Admin Master Security Key' });
    }

    let superAdmin = await User.findOne({ email }).select('+password');

    // Auto-seed Super Admin if first time logging in with default credentials
    if (!superAdmin && email === 'superadmin@civiclens.gov.in') {
      superAdmin = await User.create({
        name: 'State Super Admin',
        email: 'superadmin@civiclens.gov.in',
        password: password || 'SuperAdmin@2026',
        role: 'superadmin',
        isEmailVerified: true,
        department: 'Governance & Grievance Headquarters',
      });
      console.log('[System] Initialized Default Super Admin Account');
    }

    if (!superAdmin) {
      return res.status(401).json({ success: false, message: 'Super Admin account not found' });
    }

    if (superAdmin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Super Admin privileges required.' });
    }

    const isMatch = await superAdmin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Super Admin credentials' });
    }

    const token = generateToken(superAdmin._id, superAdmin.role);

    res.status(200).json({
      success: true,
      message: 'Super Admin authenticated successfully',
      token,
      superAdmin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        department: superAdmin.department,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

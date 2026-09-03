const Complaint = require('../models/Complaint');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

// Helper to stream upload image buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'civiclens/complaints') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloudinary_cloud_name') {
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      return resolve({ secure_url: base64 });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Helper to create and route complaint
const createComplaintRecord = async ({
  title,
  description,
  category,
  imageUrl,
  latitude,
  longitude,
  address,
  pincode,
  district,
  state,
  priority,
  citizenUser,
}) => {
  const cleanPincode = (pincode || '').toString().trim();
  
  // Auto-Routing: Find Sub-Admin mapped to this pincode and/or category
  let assignedAdmin = await User.findOne({
    role: 'subadmin',
    assignedPincodes: cleanPincode,
    $or: [{ department: category }, { department: '' }, { department: { $exists: false } }],
  });

  if (!assignedAdmin) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      assignedPincodes: cleanPincode,
    });
  }

  const complaint = await Complaint.create({
    title,
    description,
    category: category || 'Other',
    imageUrl,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    location: {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    },
    address: address || 'Location specified by GPS',
    pincode: cleanPincode,
    district: district || '',
    state: state || '',
    priority: priority || 'Medium',
    citizen: citizenUser._id,
    assignedSubAdmin: assignedAdmin ? assignedAdmin._id : null,
    status: 'Pending',
    timeline: [
      {
        status: 'Pending',
        message: assignedAdmin
          ? `Complaint registered and routed to District Officer (${assignedAdmin.name}) for PIN ${cleanPincode}`
          : `Complaint registered under PIN ${cleanPincode}. Awaiting assignment to District Admin.`,
        updatedBy: citizenUser._id,
        updaterRole: 'citizen',
        timestamp: new Date(),
      },
    ],
  });

  return { complaint, assignedAdmin };
};

// @desc    1. Create a New Complaint (Logged In Citizen)
// @route   POST /api/complaints
// @access  Private (Citizen)
exports.createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
    } = req.body;

    if (!title || !description || !pincode || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, pincode, and coordinates are required.',
      });
    }

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'civiclens/issues');
      imageUrl = result.secure_url;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a photo of the civic issue.',
      });
    }

    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      imageUrl,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: 'Complaint lodged successfully and routed to District Sub-Admin!',
      complaint,
    });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    2. Guest Citizen Submit with Email OTP & Auto-Account Creation
// @route   POST /api/complaints/submit-with-otp
// @access  Public
exports.submitComplaintWithOTP = async (req, res) => {
  try {
    const {
      name,
      email,
      otp,
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
    } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification OTP are required.' });
    }

    if (!title || !description || !pincode || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Title, description, pincode, and location are required.' });
    }

    // Verify OTP
    let user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please click "Send OTP" first.',
      });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    if (user.otp.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6 digits.' });
    }

    // Mark email verified & update user name if provided
    user.name = name || user.name || email.split('@')[0];
    user.isEmailVerified = true;
    user.otp = undefined; // clear OTP
    await user.save();

    // Image Upload
    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'civiclens/issues');
      imageUrl = result.secure_url;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Issue photo is required.' });
    }

    // Create complaint attached to this verified user
    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      imageUrl,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: user,
    });

    // Generate JWT token so citizen is instantly logged in
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account verified and grievance registered successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      complaint,
    });
  } catch (error) {
    console.error('Submit Complaint with OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    3. Get Citizen's own complaints
// @route   GET /api/complaints/my
// @access  Private (Citizen)
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .populate('assignedSubAdmin', 'name email department phone officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    4. Get Public Live Complaints
// @route   GET /api/complaints/public
// @access  Public
exports.getPublicComplaints = async (req, res) => {
  try {
    const { pincode, category, status } = req.query;
    const query = {};

    if (pincode) query.pincode = pincode;
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;

    const complaints = await Complaint.find(query)
      .select('-citizen')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    5. Get Complaints for Sub-Admin
// @route   GET /api/complaints/subadmin
// @access  Private (Sub-Admin)
exports.getSubAdminComplaints = async (req, res) => {
  try {
    const subAdmin = req.user;
    const pincodes = subAdmin.assignedPincodes || [];

    const query = {
      $or: [
        { pincode: { $in: pincodes } },
        { assignedSubAdmin: subAdmin._id },
      ],
    };

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      assignedPincodes: pincodes,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    6. Get All Complaints (Super-Admin)
// @route   GET /api/complaints/superadmin
// @access  Private (Super-Admin)
exports.getSuperAdminComplaints = async (req, res) => {
  try {
    const { pincode, district, status, category } = req.query;
    const query = {};

    if (pincode) query.pincode = pincode;
    if (district) query.district = new RegExp(district, 'i');
    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query.category = category;

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    7. Update Complaint Status & Resolution Proof
// @route   PUT /api/complaints/:id/status
// @access  Private (Sub-Admin, Super-Admin)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (req.user.role === 'subadmin') {
      const hasPincode = req.user.assignedPincodes.includes(complaint.pincode);
      const isDirectlyAssigned = complaint.assignedSubAdmin?.toString() === req.user._id.toString();
      if (!hasPincode && !isDirectlyAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update complaints outside your assigned district pincodes.',
        });
      }
    }

    if (status) complaint.status = status;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'civiclens/resolutions');
      complaint.resolvedImageUrl = result.secure_url;
    } else if (req.body.resolvedImageUrl) {
      complaint.resolvedImageUrl = req.body.resolvedImageUrl;
    }

    complaint.timeline.push({
      status: status || complaint.status,
      message: resolutionNotes || `Status updated to ${status} by ${req.user.name} (${req.user.role})`,
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      timestamp: new Date(),
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint marked as ${complaint.status}`,
      complaint,
    });
  } catch (error) {
    console.error('Update Complaint Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

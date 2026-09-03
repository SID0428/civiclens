const Complaint = require('../models/Complaint');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

const uploadToCloudinary = (buffer, folder = 'civiclens/complaints') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
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
    { expiresIn: '7d' }
  );
};

const createComplaintRecord = async ({
  title,
  description,
  category,
  images,
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
  const latNum = parseFloat(latitude.toString());
  const lngNum = parseFloat(longitude.toString());

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error('Strict GPS Coordinates are mandatory for grievance lodgement.');
  }

  const primaryImageUrl = images && images.length > 0 ? images[0].url : '';

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
    imageUrl: primaryImageUrl,
    images: images || [],
    latitude: latNum,
    longitude: lngNum,
    location: {
      type: 'Point',
      coordinates: [lngNum, latNum],
    },
    address: address || 'Geotagged location',
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
          ? `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) and auto-routed to District Officer (${assignedAdmin.name}) for PIN ${cleanPincode}`
          : `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) for PIN ${cleanPincode}. Awaiting assignment.`,
        updatedBy: citizenUser._id,
        updaterRole: 'citizen',
        timestamp: new Date(),
      },
    ],
  });

  return { complaint, assignedAdmin };
};

const processUploadedImages = async (files, reqBodyLat, reqBodyLng) => {
  const images = [];
  const lat = parseFloat(reqBodyLat.toString());
  const lng = parseFloat(reqBodyLng.toString());

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, 'civiclens/issues');
      images.push({
        url: result.secure_url,
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
      });
    }
  }
  return images;
};

// 1. Create Complaint
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

    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({
        success: false,
        message: 'Strict GPS Location is mandatory.',
      });
    }

    if (!title || !description || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and pincode are required.',
      });
    }

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'At least one live geotagged photo is required.',
      });
    }

    const images = await processUploadedImages(files, latitude, longitude);

    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      images,
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
      message: 'Grievance lodged and routed to District Officer!',
      complaint,
    });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Submit with OTP
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

    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ success: false, message: 'Strict GPS Location is mandatory.' });
    }

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification OTP are required.' });
    }

    if (!title || !description || !pincode) {
      return res.status(400).json({ success: false, message: 'Title, description, and pincode are required.' });
    }

    let user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'No OTP found for this email. Please send OTP first.' });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    if (user.otp.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    user.name = name || user.name || email.split('@')[0];
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      return res.status(400).json({ success: false, message: 'Live geotagged photo is required.' });
    }

    const images = await processUploadedImages(files, latitude, longitude);

    const { complaint } = await createComplaintRecord({
      title,
      description,
      category,
      images,
      latitude,
      longitude,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: user,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Email verified & grievance lodged!',
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

// 3. Get My Complaints
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .populate('assignedSubAdmin', 'name email department phone officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Public feed
exports.getPublicComplaints = async (req, res) => {
  try {
    const { pincode, category, status } = req.query;
    const query = {};
    if (pincode) query.pincode = pincode;
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;

    const complaints = await Complaint.find(query).select('-citizen').sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Sub-Admin Complaints
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

    const complaints = await Complaint.find(query).populate('citizen', 'name email phone').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: complaints.length, assignedPincodes: pincodes, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Super-Admin Complaints
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

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Update Status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (req.user.role === 'subadmin') {
      const hasPincode = req.user.assignedPincodes.includes(complaint.pincode);
      const isDirectlyAssigned = complaint.assignedSubAdmin && complaint.assignedSubAdmin.toString() === req.user._id.toString();
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

    res.status(200).json({ success: true, message: `Complaint marked as ${complaint.status}`, complaint });
  } catch (error) {
    console.error('Update Complaint Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { sendSubAdminWelcomeEmail } = require('../config/nodemailer');

// @desc    1. Create a New Sub-Admin (District Officer) with Assigned Pincodes
// @route   POST /api/admin/create-subadmin
// @access  Private (Super-Admin)
exports.createSubAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      department,
      assignedDistrict,
      assignedPincodes,
      officialId,
    } = req.body;

    if (!name || !email || !password || !assignedDistrict || !assignedPincodes) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, assigned district, and pincodes are required.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An officer/user with this email already exists.',
      });
    }

    // Format pincodes array
    let pincodesArray = [];
    if (Array.isArray(assignedPincodes)) {
      pincodesArray = assignedPincodes.map((p) => p.toString().trim());
    } else if (typeof assignedPincodes === 'string') {
      pincodesArray = assignedPincodes.split(',').map((p) => p.trim()).filter(Boolean);
    }

    const subAdmin = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: 'subadmin',
      department: department || 'General Civic Administration',
      assignedDistrict,
      assignedPincodes: pincodesArray,
      officialId: officialId || `GOV-${Math.floor(10000 + Math.random() * 90000)}`,
      isEmailVerified: true,
    });

    // Auto-assign existing unassigned complaints matching these pincodes
    await Complaint.updateMany(
      { pincode: { $in: pincodesArray }, assignedSubAdmin: null },
      { $set: { assignedSubAdmin: subAdmin._id } }
    );

    // Send welcome email with login credentials to the new officer
    await sendSubAdminWelcomeEmail({
      name: subAdmin.name,
      email: subAdmin.email,
      rawPassword: password, // original password before bcrypt hashing
      department: subAdmin.department,
      assignedDistrict: subAdmin.assignedDistrict,
      assignedPincodes: subAdmin.assignedPincodes,
      officialId: subAdmin.officialId,
    });

    res.status(201).json({
      success: true,
      message: `District Sub-Admin ${name} created and assigned to ${pincodesArray.length} pincode(s).`,
      subAdmin: {
        id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        department: subAdmin.department,
        assignedDistrict: subAdmin.assignedDistrict,
        assignedPincodes: subAdmin.assignedPincodes,
        officialId: subAdmin.officialId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    2. Get All Sub-Admins List
// @route   GET /api/admin/subadmins
// @access  Private (Super-Admin)
exports.getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await User.find({ role: 'subadmin' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subAdmins.length,
      subAdmins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    3. Super-Admin Master Analytics & KPI Stats
// @route   GET /api/admin/analytics
// @access  Private (Super-Admin)
exports.getAnalytics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const rejectedComplaints = await Complaint.countDocuments({ status: 'Rejected' });

    const totalCitizens = await User.countDocuments({ role: 'citizen' });
    const totalSubAdmins = await User.countDocuments({ role: 'subadmin' });

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // District / Pincode breakdown
    const pincodeStats = await Complaint.aggregate([
      { $group: { _id: '$pincode', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const resolutionRate = totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        rejectedComplaints,
        resolutionRate: `${resolutionRate}%`,
        totalCitizens,
        totalSubAdmins,
      },
      categoryStats,
      pincodeStats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Sub-Admin Details
// @route   PUT /api/admin/subadmins/:id
// @access  Private (Super-Admin)
exports.updateSubAdmin = async (req, res) => {
  try {
    const { name, phone, department, assignedDistrict, assignedPincodes, password } = req.body;

    const subAdmin = await User.findById(req.params.id);
    if (!subAdmin || subAdmin.role !== 'subadmin') {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found.' });
    }

    if (name) subAdmin.name = name;
    if (phone) subAdmin.phone = phone;
    if (department) subAdmin.department = department;
    if (assignedDistrict) subAdmin.assignedDistrict = assignedDistrict;
    if (assignedPincodes) {
      let pincodesArray = [];
      if (Array.isArray(assignedPincodes)) {
        pincodesArray = assignedPincodes.map((p) => p.toString().trim());
      } else if (typeof assignedPincodes === 'string') {
        pincodesArray = assignedPincodes.split(',').map((p) => p.trim()).filter(Boolean);
      }
      subAdmin.assignedPincodes = pincodesArray;
    }
    if (password && password.length >= 6) {
      subAdmin.password = password;
    }

    await subAdmin.save();

    res.status(200).json({
      success: true,
      message: `Sub-Admin ${subAdmin.name} updated successfully.`,
      subAdmin: {
        id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        department: subAdmin.department,
        assignedDistrict: subAdmin.assignedDistrict,
        assignedPincodes: subAdmin.assignedPincodes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Sub-Admin
// @route   DELETE /api/admin/subadmins/:id
// @access  Private (Super-Admin)
exports.deleteSubAdmin = async (req, res) => {
  try {
    const subAdmin = await User.findById(req.params.id);
    if (!subAdmin || subAdmin.role !== 'subadmin') {
      return res.status(404).json({ success: false, message: 'Sub-Admin not found.' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Unassign complaints that were assigned to this sub-admin
    await Complaint.updateMany(
      { assignedSubAdmin: req.params.id },
      { $set: { assignedSubAdmin: null } }
    );

    res.status(200).json({ success: true, message: `Sub-Admin ${subAdmin.name} deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Aliases for TypeScript frontend compatibility
if (typeof exports.getAnalytics === 'function') {
  exports.getGovernanceStats = exports.getAnalytics;
}

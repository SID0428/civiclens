import { Request, Response } from 'express';
import User from '../models/User';
import Complaint from '../models/Complaint';
import Department from '../models/Department';

// @desc    1. Create a District Sub-Admin (Super-Admin Only)
// @route   POST /api/admin/subadmins
export const createSubAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, department, assignedDistrict, assignedPincodes } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    let cleanPincodes: string[] = [];
    if (Array.isArray(assignedPincodes)) {
      cleanPincodes = assignedPincodes.map((p) => p.toString().trim());
    } else if (typeof assignedPincodes === 'string') {
      cleanPincodes = assignedPincodes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    const officialId = `OFF-${Date.now().toString().slice(-4)}`;

    const subAdmin = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: 'subadmin',
      officialId,
      department: department || 'General Administration',
      assignedDistrict: assignedDistrict || '',
      assignedPincodes: cleanPincodes,
      isEmailVerified: true,
    });

    const { sendSubAdminWelcomeEmail } = require('../config/nodemailer');
    await sendSubAdminWelcomeEmail({
      name: subAdmin.name,
      email: subAdmin.email,
      rawPassword: password,
      department: subAdmin.department,
      assignedDistrict: subAdmin.assignedDistrict || 'State Jurisdiction',
      assignedPincodes: subAdmin.assignedPincodes,
      officialId: subAdmin.officialId,
    });

    res.status(201).json({
      success: true,
      message: `District Sub-Admin ${name} registered successfully and credentials email sent to ${email}!`,
      subAdmin: {
        id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        officialId: subAdmin.officialId,
        department: subAdmin.department,
        assignedDistrict: subAdmin.assignedDistrict,
        assignedPincodes: subAdmin.assignedPincodes,
      },
    });
  } catch (error) {
    console.error('Create Sub-Admin Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    2. Get All District Sub-Admins
// @route   GET /api/admin/subadmins
export const getAllSubAdmins = async (_req: Request, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    3. Update Sub-Admin Assigned Pincodes / Jurisdiction
// @route   PUT /api/admin/subadmins/:id/pincodes
export const updateSubAdminPincodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignedPincodes, assignedDistrict, department } = req.body;
    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin || subAdmin.role !== 'subadmin') {
      res.status(404).json({ success: false, message: 'Sub-Admin not found.' });
      return;
    }

    if (assignedPincodes) {
      if (Array.isArray(assignedPincodes)) {
        subAdmin.assignedPincodes = assignedPincodes.map((p) => p.toString().trim());
      } else if (typeof assignedPincodes === 'string') {
        subAdmin.assignedPincodes = assignedPincodes
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }
    }

    if (assignedDistrict) subAdmin.assignedDistrict = assignedDistrict;
    if (department) subAdmin.department = department;

    await subAdmin.save();

    res.status(200).json({
      success: true,
      message: 'Sub-Admin jurisdiction updated successfully',
      subAdmin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    4. Overall Governance Analytics & Metrics
// @route   GET /api/admin/stats
export const getGovernanceStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const totalCitizens = await User.countDocuments({ role: 'citizen' });
    const totalSubAdmins = await User.countDocuments({ role: 'subadmin' });

    // Group by category
    const categoryBreakdown = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Group by pincode
    const pincodeBreakdown = await Complaint.aggregate([
      { $group: { _id: '$pincode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        resolvedComplaints,
        inProgressComplaints,
        pendingComplaints,
        totalCitizens,
        totalSubAdmins,
        resolutionRate: totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : '0',
        categoryBreakdown,
        pincodeBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    Send / Resend Sub-Admin Officer Credentials Email
// @route   POST /api/admin/subadmins/:id/send-email
export const sendSubAdminCredentialsEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const subAdmin = await User.findById(req.params.id);
    if (!subAdmin || subAdmin.role !== 'subadmin') {
      res.status(404).json({ success: false, message: 'District Sub-Admin officer not found.' });
      return;
    }

    const { sendSubAdminWelcomeEmail } = require('../config/nodemailer');
    const result = await sendSubAdminWelcomeEmail({
      name: subAdmin.name,
      email: subAdmin.email,
      rawPassword: password || undefined,
      department: subAdmin.department || 'General Administration',
      assignedDistrict: subAdmin.assignedDistrict || 'State Jurisdiction',
      assignedPincodes: subAdmin.assignedPincodes || [],
      officialId: subAdmin.officialId || `GOV-${subAdmin._id.toString().slice(-5).toUpperCase()}`,
    });

    if (result && result.error) {
      res.status(500).json({
        success: false,
        message: `Failed to dispatch email to ${subAdmin.email}: ${result.error}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Official credentials email dispatched successfully to ${subAdmin.name} (${subAdmin.email})!`,
    });
  } catch (error) {
    console.error('Send SubAdmin Email Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message || 'Failed to dispatch officer credentials email.' });
  }
};

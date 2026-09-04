import { Request, Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import cloudinary from '../config/cloudinary';
import jwt from 'jsonwebtoken';
import { AuthRequest, IComplaintImage, IUser, UserRole } from '../types';

const uploadToCloudinary = (buffer: Buffer, folder: string = 'civiclens/complaints'): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      return resolve({ secure_url: base64 });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as { secure_url: string });
      }
    );
    uploadStream.end(buffer);
  });
};

const generateToken = (id: string, role: UserRole): string => {
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
}: {
  title: string;
  description: string;
  category: any;
  images: IComplaintImage[];
  latitude: number | string;
  longitude: number | string;
  address: string;
  pincode: string;
  district?: string;
  state?: string;
  priority?: any;
  citizenUser: IUser;
}) => {
  const cleanPincode = (pincode || '').toString().trim();
  const latNum = parseFloat(latitude.toString());
  const lngNum = parseFloat(longitude.toString());

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error('Strict GPS Coordinates are mandatory for grievance lodgement.');
  }

  const primaryImageUrl = images && images.length > 0 ? images[0].url : '';

  const cleanDistrict = (district || '').toString().trim();

  // 1. Try District + Category match
  let assignedAdmin = await User.findOne({
    role: 'subadmin',
    assignedDistrict: new RegExp(`^${cleanDistrict}$`, 'i'),
    $or: [{ department: category }, { department: 'All Departments' }, { department: '' }, { department: { $exists: false } }],
  });

  // 2. Try District match
  if (!assignedAdmin && cleanDistrict) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      assignedDistrict: new RegExp(`^${cleanDistrict}$`, 'i'),
    });
  }

  // 3. Try District partial regex match
  if (!assignedAdmin && cleanDistrict) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      assignedDistrict: { $regex: cleanDistrict, $options: 'i' },
    });
  }

  // 4. Fallback to pincode match if district is not assigned
  if (!assignedAdmin && cleanPincode) {
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
    district: cleanDistrict,
    state: state || '',
    priority: priority || 'Medium',
    citizen: citizenUser._id,
    assignedSubAdmin: assignedAdmin ? assignedAdmin._id : null,
    status: 'Pending',
    timeline: [
      {
        status: 'Pending',
        message: assignedAdmin
          ? `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) and auto-routed to District (${assignedAdmin.assignedDistrict || cleanDistrict}) Officer (${assignedAdmin.name})`
          : `Grievance registered with GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)}) for District (${cleanDistrict || 'State'}). Awaiting assignment.`,
        updatedBy: citizenUser._id,
        updaterRole: 'citizen',
        timestamp: new Date(),
      },
    ],
  });

  return { complaint, assignedAdmin };
};

const processUploadedImages = async (
  files: Express.Multer.File[],
  reqBodyLat: number | string,
  reqBodyLng: number | string
): Promise<IComplaintImage[]> => {
  const images: IComplaintImage[] = [];
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

// @desc    1. Create Complaint (Logged-in Citizen)
// @route   POST /api/complaints
export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
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
      res.status(400).json({
        success: false,
        message: 'Strict GPS Location is mandatory. Please capture location before submitting.',
      });
      return;
    }

    if (!title || !description || !pincode) {
      res.status(400).json({
        success: false,
        message: 'Title, description, and pincode are required.',
      });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      res.status(400).json({
        success: false,
        message: 'At least one live geotagged photo is required.',
      });
      return;
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
      citizenUser: req.user!,
    });

    res.status(201).json({
      success: true,
      message: 'Grievance with geotagged photo(s) lodged and routed to District Officer!',
      complaint,
    });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    2. Guest Citizen Submit with Email OTP
// @route   POST /api/complaints/submit-with-otp
export const submitComplaintWithOTP = async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({
        success: false,
        message: 'Strict GPS Location is mandatory.',
      });
      return;
    }

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and verification OTP are required.' });
      return;
    }

    if (!title || !description || !pincode) {
      res.status(400).json({ success: false, message: 'Title, description, and pincode are required.' });
      return;
    }

    let user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code) {
      res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please click "Send OTP" first.',
      });
      return;
    }

    if (new Date() > new Date(user.otp.expiresAt || 0)) {
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
      return;
    }

    if (user.otp.code !== otp.trim()) {
      res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6 digits.' });
      return;
    }

    user.name = name || user.name || email.split('@')[0];
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (files.length === 0 && !req.body.imageUrl) {
      res.status(400).json({ success: false, message: 'Live geotagged photo is required.' });
      return;
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

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'Email verified, geotagged photos uploaded & grievance lodged!',
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
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    3. Get Citizen's own complaints
// @route   GET /api/complaints/my
export const getMyComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const complaints = await Complaint.find({ citizen: req.user?._id })
      .populate('assignedSubAdmin', 'name email department phone officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    4. Get Public Live Feed
// @route   GET /api/complaints/public
export const getPublicComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincode, category, status } = req.query;
    const query: any = {};

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
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    5. Get Sub-Admin Complaints (District Pincode Scoped)
// @route   GET /api/complaints/subadmin
export const getSubAdminComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subAdmin = req.user!;
    const pincodes = subAdmin.assignedPincodes || [];
    const district = (subAdmin.assignedDistrict || '').trim();

    const query: any = {
      $or: [
        { assignedSubAdmin: subAdmin._id },
        ...(district ? [{ district: new RegExp(`^${district}$`, 'i') }, { district: new RegExp(district, 'i') }] : []),
        ...(pincodes.length > 0 ? [{ pincode: { $in: pincodes } }] : []),
      ],
    };

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      assignedDistrict: district,
      assignedPincodes: pincodes,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    6. Get All Complaints (Super-Admin)
// @route   GET /api/complaints/superadmin
export const getSuperAdminComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincode, district, status, category } = req.query;
    const query: any = {};

    if (pincode) query.pincode = pincode;
    if (district) query.district = new RegExp(district as string, 'i');
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
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// @desc    7. Update Status & Resolution Proof
// @route   PUT /api/complaints/:id/status
export const updateComplaintStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }

    if (req.user?.role === 'subadmin') {
      const hasPincode = req.user.assignedPincodes.includes(complaint.pincode);
      const isDirectlyAssigned = complaint.assignedSubAdmin?.toString() === req.user._id.toString();
      if (!hasPincode && !isDirectlyAssigned) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to update complaints outside your assigned district pincodes.',
        });
        return;
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
      message: resolutionNotes || `Status updated to ${status} by ${req.user?.name} (${req.user?.role})`,
      updatedBy: req.user!._id,
      updaterRole: req.user!.role,
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
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

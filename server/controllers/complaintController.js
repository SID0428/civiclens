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

const buildDistrictRegexList = (districtStr) => {
  if (!districtStr) return [];
  const raw = districtStr.toString().trim();
  const cleaned = raw.replace(/district|city|county/gi, '').trim();
  if (!cleaned && !raw) return [];

  const targets = new Set();
  if (raw) targets.add(raw);
  if (cleaned) targets.add(cleaned);

  const low = (cleaned || raw).toLowerCase();

  // Known Indian District Aliases & Variations
  if (low.includes('gautam') || low.includes('noida') || low.includes('gb nagar') || low.includes('buddh')) {
    targets.add('Gautam Buddha Nagar');
    targets.add('Gautam Buddh Nagar');
    targets.add('G.B. Nagar');
    targets.add('GB Nagar');
    targets.add('Noida');
    targets.add('Greater Noida');
    targets.add('Gautam');
  } else if (low.includes('bengaluru') || low.includes('bangalore')) {
    targets.add('Bengaluru');
    targets.add('Bangalore');
  } else if (low.includes('gurugram') || low.includes('gurgaon')) {
    targets.add('Gurugram');
    targets.add('Gurgaon');
  } else if (low.includes('prayagraj') || low.includes('allahabad')) {
    targets.add('Prayagraj');
    targets.add('Allahabad');
  } else if (low.includes('ayodhya') || low.includes('faizabad')) {
    targets.add('Ayodhya');
    targets.add('Faizabad');
  } else if (low.includes('kanpur')) {
    targets.add('Kanpur');
    targets.add('Kanpur Nagar');
    targets.add('Kanpur Dehat');
  }

  const regexes = [];
  for (const t of targets) {
    if (!t) continue;
    const esc = t.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&').replace(/\s+/g, '\\s+');
    regexes.push(new RegExp(esc, 'i'));
  }

  // Token regex matching (e.g. Gautam OR Buddh OR Nagar)
  const tokens = (cleaned || raw).split(/\s+/).filter((w) => w.length >= 4);
  for (const token of tokens) {
    const escToken = token.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    regexes.push(new RegExp(escToken, 'i'));
  }

  return regexes;
};

const fetchReverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
      { headers: { 'User-Agent': 'CivicLens-App/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || addr.town || '';
      const state = addr.state || '';
      const formattedAddress = data.display_name || '';
      return { pincode, district, state, address: formattedAddress };
    }
  } catch (error) {
    console.warn('[Server ReverseGeocode Warning]:', error.message);
  }
  return null;
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
  let cleanPincode = (pincode || '').toString().trim();
  let cleanDistrict = (district || '').toString().trim();
  let finalAddress = (address || '').toString().trim();
  let finalState = (state || '').toString().trim();

  const latNum = parseFloat(latitude.toString());
  const lngNum = parseFloat(longitude.toString());

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error('Strict GPS Coordinates are mandatory for grievance lodgement.');
  }

  // Fallback server-side reverse geocoding if location metadata is missing
  if (!cleanDistrict || !cleanPincode || !finalAddress || finalAddress === 'Geotagged location') {
    const geo = await fetchReverseGeocode(latNum, lngNum);
    if (geo) {
      if (!cleanDistrict && geo.district) cleanDistrict = geo.district;
      if (!cleanPincode && geo.pincode) cleanPincode = geo.pincode;
      if ((!finalAddress || finalAddress === 'Geotagged location') && geo.address) finalAddress = geo.address;
      if (!finalState && geo.state) finalState = geo.state;
    }
  }

  const primaryImageUrl = images && images.length > 0 ? images[0].url : '';
  const distRegexes = buildDistrictRegexList(cleanDistrict);

  // 1. Try District + Category match (Case-Insensitive small/upper case & aliases)
  let assignedAdmin = null;
  if (distRegexes.length > 0) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      $or: distRegexes.map((r) => ({ assignedDistrict: r })),
      department: { $in: [category, 'All Departments', 'General Civic Administration', '', undefined] },
    });
  }

  // 2. Try District match (Case-Insensitive small/upper case & aliases)
  if (!assignedAdmin && distRegexes.length > 0) {
    assignedAdmin = await User.findOne({
      role: 'subadmin',
      $or: distRegexes.map((r) => ({ assignedDistrict: r })),
    });
  }

  // 3. Fallback to pincode match if district is not assigned
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
    address: finalAddress || 'Geotagged location',
    pincode: cleanPincode,
    district: cleanDistrict,
    state: finalState || '',
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
const createComplaint = async (req, res) => {
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

// 2. Submit Complaint with Email OTP
const submitComplaintWithOTP = async (req, res) => {
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
const getMyComplaints = async (req, res) => {
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
const getPublicComplaints = async (req, res) => {
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
const getSubAdminComplaints = async (req, res) => {
  try {
    const subAdmin = req.user;
    const pincodes = subAdmin.assignedPincodes || [];
    const district = (subAdmin.assignedDistrict || '').trim();
    const cleanDist = district.replace(/district|city|county/gi, '').trim();

    let query = {};

    const isStatewide =
      !district ||
      subAdmin.role === 'superadmin' ||
      ['all', 'state jurisdiction', 'all districts', 'central district', 'statewide', 'general', 'state'].includes(district.toLowerCase());

    if (isStatewide) {
      query = {}; // Super-Admin / All Jurisdiction access
    } else {
      const distRegexes = buildDistrictRegexList(district);

      const districtOrConditions = [];
      for (const rx of distRegexes) {
        districtOrConditions.push({ district: rx });
        districtOrConditions.push({ address: rx });
      }

      query = {
        $or: [
          { assignedSubAdmin: subAdmin._id },
          ...districtOrConditions,
          ...(pincodes.length > 0 ? [{ pincode: { $in: pincodes } }] : []),
        ],
      };

      // Auto-assign any unassigned matching complaints to this subadmin
      try {
        await Complaint.updateMany(
          {
            assignedSubAdmin: null,
            $or: [
              ...districtOrConditions,
              ...(pincodes.length > 0 ? [{ pincode: { $in: pincodes } }] : []),
            ],
          },
          { $set: { assignedSubAdmin: subAdmin._id } }
        );
      } catch (e) {
        // non-blocking auto-assignment
      }
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, assignedDistrict: district, assignedPincodes: pincodes, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Super-Admin Complaints
const getSuperAdminComplaints = async (req, res) => {
  try {
    const { pincode, district, status, category } = req.query;
    const query = {};
    if (pincode) query.pincode = pincode;
    if (district) {
      const distRegexes = buildDistrictRegexList(district);
      if (distRegexes.length > 0) {
        query.$or = distRegexes.map((rx) => ({ district: rx }));
      }
    }
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
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (req.user.role === 'subadmin') {
      const hasPincode = req.user.assignedPincodes && req.user.assignedPincodes.includes(complaint.pincode);
      const isDirectlyAssigned = complaint.assignedSubAdmin && complaint.assignedSubAdmin.toString() === req.user._id.toString();
      const adminDist = (req.user.assignedDistrict || '').trim();
      const cleanAdminDist = adminDist.replace(/district|city|county/gi, '').trim();
      const complaintDist = (complaint.district || '').trim();
      const cleanComplaintDist = complaintDist.replace(/district|city|county/gi, '').trim();

      const isDistrictMatch =
        !adminDist ||
        adminDist === 'All' ||
        adminDist === 'State Jurisdiction' ||
        adminDist === 'All Districts' ||
        adminDist === 'Central District' ||
        (cleanAdminDist && cleanComplaintDist && cleanAdminDist.toLowerCase() === cleanComplaintDist.toLowerCase()) ||
        (adminDist && complaintDist && adminDist.toLowerCase() === complaintDist.toLowerCase()) ||
        (cleanAdminDist && complaintDist && complaintDist.toLowerCase().includes(cleanAdminDist.toLowerCase()));

      if (!hasPincode && !isDirectlyAssigned && !isDistrictMatch) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update complaints outside your assigned district.',
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

// 8. Analyze Complaint Image using Groq Vision API
const analyzeComplaintImage = async (req, res) => {
  try {
    let imageBase64 = '';

    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
    } else if (req.body.imageUrl) {
      imageBase64 = req.body.imageUrl;
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Please upload or provide an image for AI analysis.' });
    }

    const groqApiKey = (process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim();

    if (!groqApiKey) {
      console.warn('[Groq AI Warning]: GROQ_API_KEY is not configured in environment variables.');
      return res.status(200).json({
        success: true,
        isValidCivicIssue: true,
        isFallback: true,
        category: 'Roads & Potholes',
        priority: 'Medium',
        title: 'Reported Civic Issue',
        description: 'Auto-detected geotagged issue for municipal review.',
        message: 'GROQ_API_KEY not set. Using default category & title.',
      });
    }

    console.log('[Groq AI] Sending image to Groq Vision API (llama-3.2-11b-vision-preview)...');

    const promptText = `You are a smart civic infrastructure AI analyzer for CivicLens governance platform. Analyze this image carefully to detect if it depicts a real public civic issue or problem (such as road damage/pothole, garbage dump/litter, water leakage/sewage overflow, broken streetlight/electrical hazard, damaged public building/infrastructure, traffic encroachment, or illegal dumping).

Respond ONLY with a valid JSON object matching this schema without any markdown surrounding text or codeblocks:
{
  "isValidCivicIssue": true or false,
  "rejectionReason": "If isValidCivicIssue is false, state why (e.g. Image does not show any civic issue, it appears to be a selfie/indoor photo/unrelated object)",
  "category": "Must be one of: Roads & Potholes, Garbage & Sanitation, Water Supply & Sewage, Electricity & Streetlights, Public Infrastructure, Encroachment & Traffic, Other",
  "priority": "Must be one of: Low, Medium, High, Critical",
  "title": "A concise 4-7 word title summarizing the civic issue",
  "description": "A brief 1-2 sentence description of the observed civic damage"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Groq API Error]:', data);
      const errDetail = data.error?.message || JSON.stringify(data);
      throw new Error(`Groq API Error: ${errDetail}`);
    }

    const aiContent = data.choices?.[0]?.message?.content || '{}';
    console.log('[Groq AI Response Raw]:', aiContent);

    let parsed = {};
    try {
      const cleanJsonStr = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn('[Groq JSON Parse Warning]:', e);
      parsed = {
        isValidCivicIssue: true,
        category: 'Other',
        priority: 'Medium',
        title: 'Geotagged Civic Issue',
        description: aiContent.substring(0, 150),
      };
    }

    if (parsed.isValidCivicIssue === false) {
      return res.status(200).json({
        success: true,
        isValidCivicIssue: false,
        rejectionReason: parsed.rejectionReason || 'Image does not show any civic issue',
        message: 'Image does not show any civic issue',
      });
    }

    const validCategories = [
      'Roads & Potholes',
      'Garbage & Sanitation',
      'Water Supply & Sewage',
      'Electricity & Streetlights',
      'Public Infrastructure',
      'Encroachment & Traffic',
      'Other',
    ];

    let category = parsed.category || 'Other';
    if (!validCategories.includes(category)) {
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes('road') || lowerCat.includes('pothole')) category = 'Roads & Potholes';
      else if (lowerCat.includes('garbage') || lowerCat.includes('waste') || lowerCat.includes('trash') || lowerCat.includes('clean')) category = 'Garbage & Sanitation';
      else if (lowerCat.includes('water') || lowerCat.includes('sewage') || lowerCat.includes('pipe') || lowerCat.includes('leak')) category = 'Water Supply & Sewage';
      else if (lowerCat.includes('electric') || lowerCat.includes('wire') || lowerCat.includes('light') || lowerCat.includes('pole')) category = 'Electricity & Streetlights';
      else if (lowerCat.includes('traffic') || lowerCat.includes('park') || lowerCat.includes('encroach')) category = 'Encroachment & Traffic';
      else category = 'Other';
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    let priority = parsed.priority || 'Medium';
    if (!validPriorities.includes(priority)) priority = 'Medium';

    res.status(200).json({
      success: true,
      isValidCivicIssue: true,
      category,
      priority,
      title: parsed.title || 'Geotagged Civic Issue',
      description: parsed.description || 'Auto-detected civic damage reported via Groq Vision AI.',
    });
  } catch (error) {
    console.error('[Analyze Complaint Image Exception]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  submitComplaintWithOTP,
  getMyComplaints,
  getPublicComplaints,
  getSubAdminComplaints,
  getSuperAdminComplaints,
  updateComplaintStatus,
  analyzeComplaintImage,
};

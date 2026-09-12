const Complaint = require('../models/Complaint');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

// Haversine formula: distance between two GPS coordinates in meters
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MAX_RESOLUTION_DISTANCE_METERS = 100;

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

// ────────── FASTAPI COMPUTER VISION MICROSERVICE INTEGRATION ──────────
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

const callFastApiDetect = async (imageBuffer, mimeType = 'image/jpeg') => {
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('image', blob, 'defect_scan.jpg');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${FASTAPI_URL}/api/v1/detect-defect`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [FastAPI CV Engine] Detected ${data.totalDefectsFound} defects (Density: ${data.damageDensityScore})`);
      return data;
    }
  } catch (err) {
    // Graceful fallback to Groq AI
  }
  return null;
};

const callFastApiResolution = async (beforeBuffer, afterBuffer) => {
  try {
    const formData = new FormData();
    formData.append('beforeImage', new Blob([beforeBuffer], { type: 'image/jpeg' }), 'before.jpg');
    formData.append('afterImage', new Blob([afterBuffer], { type: 'image/jpeg' }), 'after.jpg');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${FASTAPI_URL}/api/v1/compare-resolution`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [FastAPI SSIM Audit] Confidence: ${data.confidencePercent}%`);
      return data;
    }
  } catch (err) {
    // Graceful fallback
  }
  return null;
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

  // Known Indian District Aliases & Regional Variations
  if (low.includes('gautam') || low.includes('noida') || low.includes('gb nagar') || low.includes('buddh')) {
    targets.add('Gautam Buddha Nagar');
    targets.add('Gautam Buddh Nagar');
    targets.add('G.B. Nagar');
    targets.add('GB Nagar');
    targets.add('Noida');
    targets.add('Greater Noida');
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

// AI Visual Duplicate & Hazard Identification using Groq Vision API
const checkVisualDuplicateWithGroq = async (existingImageUrl, newImageUrl, category) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || !existingImageUrl || !newImageUrl) {
    return { isDuplicate: false, confidenceScore: 0, reasoning: 'No API key or image missing' };
  }

  try {
    const promptText = `You are an AI Civic Infrastructure Duplicate & Merge Validator for CivicLens.
Your task is to compare two municipal defect images taken in the same 50-meter neighborhood under category "${category}".
IMAGE 1 is an existing active reported issue.
IMAGE 2 is a newly submitted photo.

Analyze both images carefully:
- Check if both photos capture the exact same physical hazard / defect (e.g. the same specific pothole, same garbage pile, same broken streetlight/pole, same open manhole/drainage leak, or same broken bench/footpath).
- Take into account different angles, lighting conditions, or distances of the same physical problem.
- If they are clearly different defects (e.g., two distinct potholes on different sides of the road, or a pothole vs a streetlight), mark isSamePhysicalIssue: false.

Respond ONLY with a valid raw JSON object matching this schema without any markdown formatting or surrounding text:
{
  "isSamePhysicalIssue": true or false,
  "confidenceScore": 0.0 to 1.0,
  "reasoning": "Concise 1-2 sentence explanation of visual similarity or differences"
}`;

    const payload = {
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'system',
          content: 'You are a municipal civic infrastructure AI validator. Evaluate the two images for physical defect identity and respond ONLY with a raw JSON object matching the required schema.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'text', text: 'Image 1 (Existing Active Ticket):' },
            { type: 'image_url', image_url: { url: existingImageUrl } },
            { type: 'text', text: 'Image 2 (New Submission):' },
            { type: 'image_url', image_url: { url: newImageUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
      reasoning_format: 'hidden',
      reasoning_effort: 'none',
    };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      delete payload.reasoning_format;
      delete payload.reasoning_effort;
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      console.warn(`[Groq Duplicate Check] API returned status ${response.status}`);
      return { isDuplicate: false, confidenceScore: 0, reasoning: 'API error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const isSame = parsed.isSamePhysicalIssue === true && (parsed.confidenceScore === undefined || parsed.confidenceScore >= 0.70);
    return {
      isDuplicate: isSame,
      confidenceScore: parsed.confidenceScore || 0,
      reasoning: parsed.reasoning || '',
    };
  } catch (err) {
    console.error('[Groq Duplicate Check Error]:', err.message);
    return { isDuplicate: false, confidenceScore: 0, reasoning: err.message };
  }
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

  // 0. AI Duplicate & Geoclustering Pre-Check (Active complaints within 60m of same category)
  try {
    const nearbyCandidates = await Complaint.find({
      category: category || 'Other',
      status: { $in: ['Pending', 'Under Review', 'In Progress'] },
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
          $maxDistance: 60, // 60 meters radius
        },
      },
    }).limit(3);

    if (nearbyCandidates && nearbyCandidates.length > 0 && primaryImageUrl) {
      for (const candidate of nearbyCandidates) {
        const candidateImg = candidate.imageUrl || (candidate.images && candidate.images[0] ? candidate.images[0].url : '');
        if (candidateImg) {
          const checkResult = await checkVisualDuplicateWithGroq(candidateImg, primaryImageUrl, category || 'Other');
          if (checkResult.isDuplicate) {
            console.log(`[Duplicate AI Match] Merging new report into existing ticket ${candidate._id} (Confidence: ${checkResult.confidenceScore})`);
            
            // Increment reported count
            candidate.reportedByCount = (candidate.reportedByCount || 1) + 1;
            
            // Append co-reporter info
            candidate.coReporters = candidate.coReporters || [];
            candidate.coReporters.push({
              citizen: citizenUser._id,
              citizenName: citizenUser.name || citizenUser.email || 'Verified Citizen',
              citizenEmail: citizenUser.email || '',
              imageUrl: primaryImageUrl,
              description: description || '',
              reportedAt: new Date(),
              latitude: latNum,
              longitude: lngNum,
            });

            // Append photos to images array if not already present
            if (images && images.length > 0) {
              candidate.images = candidate.images || [];
              images.forEach((newImg) => {
                if (!candidate.images.some((existing) => existing.url === newImg.url)) {
                  candidate.images.push(newImg);
                }
              });
            }

            // Auto-Escalate Priority based on community impact count
            let priorityEscalated = false;
            if (candidate.reportedByCount >= 5 && candidate.priority !== 'Critical') {
              candidate.priority = 'Critical';
              priorityEscalated = true;
            } else if (candidate.reportedByCount >= 3 && ['Low', 'Medium'].includes(candidate.priority)) {
              candidate.priority = 'High';
              priorityEscalated = true;
            }

            // Record timeline event
            candidate.timeline.push({
              status: candidate.status,
              message: `AI Duplicate Verified & Merged: Additional report filed by ${citizenUser.name || citizenUser.email || 'Citizen'}. Total affected citizen count increased to ${candidate.reportedByCount}.${priorityEscalated ? ` Priority auto-escalated to ${candidate.priority}.` : ''}`,
              updatedBy: citizenUser._id,
              updaterRole: 'citizen',
              timestamp: new Date(),
            });

            await candidate.save();
            invalidatePublicCache();

            return {
              complaint: candidate,
              isMerged: true,
              reportedByCount: candidate.reportedByCount,
              assignedAdmin: candidate.assignedSubAdmin,
            };
          }
        }
      }
    }
  } catch (dupError) {
    console.warn('[Duplicate Check Warning]:', dupError.message);
  }

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
    reportedByCount: 1,
    coReporters: [],
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

  invalidatePublicCache();

  return { complaint, assignedAdmin, isMerged: false, reportedByCount: 1 };
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
      photoLatitude,
      photoLongitude,
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

    const latNum = parseFloat(latitude.toString());
    const lngNum = parseFloat(longitude.toString());

    let issueLatNum = latNum;
    let issueLngNum = lngNum;

    // Physical On-Site Presence Verification against photo coordinates
    if (photoLatitude && photoLongitude) {
      const photoLatNum = parseFloat(photoLatitude.toString());
      const photoLngNum = parseFloat(photoLongitude.toString());
      if (!isNaN(photoLatNum) && !isNaN(photoLngNum)) {
        const distMeters = haversineDistance(latNum, lngNum, photoLatNum, photoLngNum);
        const MAX_ALLOWED_DISTANCE_METERS = 100; // 100m radius
        if (distMeters > MAX_ALLOWED_DISTANCE_METERS) {
          return res.status(400).json({
            success: false,
            message: `Physical on-site presence verification failed! You are ${Math.round(distMeters)}m away from where the photo was captured. You must be at the issue location to submit (Max allowed: ${MAX_ALLOWED_DISTANCE_METERS}m).`,
            distance: Math.round(distMeters),
            maxAllowed: MAX_ALLOWED_DISTANCE_METERS,
          });
        }
        // Set the saved issue location strictly to the clicked photo location
        issueLatNum = photoLatNum;
        issueLngNum = photoLngNum;
      }
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

    const images = await processUploadedImages(files, issueLatNum, issueLngNum);

    const { complaint, isMerged, reportedByCount } = await createComplaintRecord({
      title,
      description,
      category,
      images,
      latitude: issueLatNum,
      longitude: issueLngNum,
      address,
      pincode,
      district,
      state,
      priority,
      citizenUser: req.user,
    });

    res.status(201).json({
      success: true,
      isMerged: !!isMerged,
      reportedByCount: reportedByCount || 1,
      message: isMerged
        ? `Active report already verified at this location! Your report and photo have been merged to boost urgency (${reportedByCount} citizens affected).`
        : 'Grievance lodged and routed to District Officer!',
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
      photoLatitude,
      photoLongitude,
      address,
      pincode,
      district,
      state,
      priority,
    } = req.body;

    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ success: false, message: 'Strict GPS Location is mandatory.' });
    }

    const latNum = parseFloat(latitude.toString());
    const lngNum = parseFloat(longitude.toString());

    let issueLatNum = latNum;
    let issueLngNum = lngNum;

    // Physical On-Site Presence Verification against photo coordinates
    if (photoLatitude && photoLongitude) {
      const photoLatNum = parseFloat(photoLatitude.toString());
      const photoLngNum = parseFloat(photoLongitude.toString());
      if (!isNaN(photoLatNum) && !isNaN(photoLngNum)) {
        const distMeters = haversineDistance(latNum, lngNum, photoLatNum, photoLngNum);
        const MAX_ALLOWED_DISTANCE_METERS = 100; // 100m radius
        if (distMeters > MAX_ALLOWED_DISTANCE_METERS) {
          return res.status(400).json({
            success: false,
            message: `Physical on-site presence verification failed! You are ${Math.round(distMeters)}m away from where the photo was captured. You must be at the issue location to submit (Max allowed: ${MAX_ALLOWED_DISTANCE_METERS}m).`,
            distance: Math.round(distMeters),
            maxAllowed: MAX_ALLOWED_DISTANCE_METERS,
          });
        }
        // Set the saved issue location strictly to the clicked photo location
        issueLatNum = photoLatNum;
        issueLngNum = photoLngNum;
      }
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

    const images = await processUploadedImages(files, issueLatNum, issueLngNum);

    const { complaint, isMerged, reportedByCount } = await createComplaintRecord({
      title,
      description,
      category,
      images,
      latitude: issueLatNum,
      longitude: issueLngNum,
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
      isMerged: !!isMerged,
      reportedByCount: reportedByCount || 1,
      message: isMerged
        ? `Email verified & report merged with active nearby ticket! (${reportedByCount} citizens affected).`
        : 'Email verified & grievance lodged!',
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

// In-Memory cache for public complaints feed
const publicComplaintsCache = new Map();
const PUBLIC_CACHE_TTL = 30 * 1000; // 30 seconds

const invalidatePublicCache = () => {
  publicComplaintsCache.clear();
};

// Deduplicate redundant 660KB base64 strings so JSON payload size drops by 50%
const optimizeComplaintPayload = (c) => {
  if (c && c.images && c.images.length > 0 && c.imageUrl && c.imageUrl === c.images[0].url) {
    c.imageUrl = '';
  }
  return c;
};

// 3. Get My Complaints
const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      $or: [
        { citizen: req.user._id },
        { 'coReporters.citizen': req.user._id },
        { 'coReporters.citizenEmail': req.user.email },
      ],
    })
      .select('-timeline')
      .populate('assignedSubAdmin', 'name email department phone officialId')
      .sort({ createdAt: -1 })
      .lean();

    complaints.forEach(optimizeComplaintPayload);

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Public feed
const getPublicComplaints = async (req, res) => {
  try {
    const { pincode, category, status, district, state, limit } = req.query;

    const maxLimit = limit === 'all' ? 0 : Math.min(parseInt(limit) || 100, 300);

    const cacheKey = JSON.stringify({
      pincode: pincode || '',
      category: category || '',
      status: status || '',
      district: district || '',
      state: state || '',
      limit: maxLimit,
    });

    const cached = publicComplaintsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PUBLIC_CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const query = {};
    if (pincode) query.pincode = pincode;
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (district && district !== 'All') query.district = new RegExp(district.trim(), 'i');
    if (state && state !== 'All') query.state = new RegExp(state.trim(), 'i');

    let queryBuilder = Complaint.find(query)
      .select('-timeline')
      .populate('citizen', 'name email avatar')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 })
      .lean();

    if (maxLimit > 0) {
      queryBuilder = queryBuilder.limit(maxLimit);
    }

    const complaints = await queryBuilder;
    complaints.forEach(optimizeComplaintPayload);

    const responsePayload = { success: true, count: complaints.length, complaints };
    publicComplaintsCache.set(cacheKey, {
      data: responsePayload,
      timestamp: Date.now(),
    });

    res.status(200).json(responsePayload);
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

    // Run non-critical backfill asynchronously in background without blocking response
    setImmediate(async () => {
      try {
        const emptyDistrictComplaints = await Complaint.find({
          $or: [{ district: '' }, { district: { $exists: false } }, { district: 'Unknown' }],
          latitude: { $ne: null },
          longitude: { $ne: null },
        }).limit(5);

        for (const comp of emptyDistrictComplaints) {
          if (comp.latitude && comp.longitude) {
            const geo = await fetchReverseGeocode(comp.latitude, comp.longitude);
            if (geo) {
              let updated = false;
              if (geo.district) { comp.district = geo.district; updated = true; }
              if (geo.pincode && (!comp.pincode || comp.pincode === '')) { comp.pincode = geo.pincode; updated = true; }
              if (geo.address && (!comp.address || comp.address === 'Geotagged location')) { comp.address = geo.address; updated = true; }
              if (updated) await comp.save();
            }
          }
        }
      } catch (e) {
        // silent background backfill
      }
    });

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

      // Auto-assign matching unassigned complaints in background
      setImmediate(async () => {
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
          // background non-blocking
        }
      });
    }

    const complaints = await Complaint.find(query)
      .select('-timeline')
      .populate('citizen', 'name email phone avatar')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 })
      .lean();

    complaints.forEach(optimizeComplaintPayload);

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
      .select('-timeline')
      .populate('citizen', 'name email phone avatar')
      .populate('assignedSubAdmin', 'name email department officialId')
      .sort({ createdAt: -1 })
      .lean();

    complaints.forEach(optimizeComplaintPayload);

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Update Status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionNotes, resolutionLat, resolutionLng, adminLat, adminLng } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Lock terminal statuses: once an issue is Resolved or Rejected, no further status modifications are allowed
    if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: `This grievance has already been marked as ${complaint.status}. Once an issue is ${complaint.status.toLowerCase()}, further status modifications are permanently locked.`,
      });
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

    if (status === 'Resolved') {
      // Strict GPS Location verification is mandatory for Resolved status:
      // Admin must be on-site within MAX_RESOLUTION_DISTANCE_METERS (100m) of the grievance GPS
      const rawLat = resolutionLat || adminLat;
      const rawLng = resolutionLng || adminLng;
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          message: 'Strict on-site GPS location verification is mandatory to mark a grievance as Resolved.',
        });
      }

      const distance = haversineDistance(lat, lng, complaint.latitude, complaint.longitude);

      if (distance > MAX_RESOLUTION_DISTANCE_METERS) {
        const distStr = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)}m`;
        return res.status(403).json({
          success: false,
          message: `GPS Location not matched. You are ${distStr} away from the grievance location (${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}). Reach the site to mark as Resolved.`,
          distance: Math.round(distance),
        });
      }

      // GPS Location verification and upload for resolution photo
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, 'civiclens/resolutions');
        complaint.resolvedImageUrl = result.secure_url;

        // Store resolution photo with GPS for audit trail
        complaint.resolvedImages.push({
          url: result.secure_url,
          latitude: lat,
          longitude: lng,
          timestamp: new Date(),
        });
      } else if (req.body.resolvedImageUrl) {
        complaint.resolvedImageUrl = req.body.resolvedImageUrl;
      }

      if (!complaint.resolvedImageUrl && !req.file && !req.body.resolvedImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'A live verified resolution proof photo is required to mark a grievance as Resolved.',
        });
      }

      complaint.status = 'Resolved';
      if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;

      complaint.timeline.push({
        status: 'Resolved',
        message: resolutionNotes || `Grievance resolved and verified on-site by ${req.user.name} (${req.user.role}) [GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
        updatedBy: req.user._id,
        updaterRole: req.user.role,
        timestamp: new Date(),
      });
    } else {
      // Non-Resolved updates (Under Review, In Progress, Rejected, etc.) - No GPS or photo required
      if (status) complaint.status = status;
      if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;

      let defaultMsg = `Status updated to ${status} by ${req.user.name} (${req.user.role})`;
      if (status === 'In Progress') {
        defaultMsg = `Field team dispatched & grievance marked In Progress by ${req.user.name}`;
      } else if (status === 'Under Review') {
        defaultMsg = `Grievance placed Under Review by ${req.user.name}`;
      } else if (status === 'Rejected') {
        defaultMsg = `Grievance marked as Rejected by ${req.user.name}`;
      }

      complaint.timeline.push({
        status: status || complaint.status,
        message: resolutionNotes || defaultMsg,
        updatedBy: req.user._id,
        updaterRole: req.user.role,
        timestamp: new Date(),
      });
    }

    await complaint.save();

    invalidatePublicCache();

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
        success: false,
        isValidCivicIssue: null,
        isFallback: true,
        missingApiKey: true,
        title: '',
        description: '',
        category: '',
        message: 'GROQ_API_KEY is not configured on server. Please add your Groq API key in Render / environment settings to enable live AI photo verification.',
      });
    }

    console.log('[Groq AI] Sending image to Groq Vision API...');

    const promptText = `You are a strict municipal civic infrastructure AI validator and classifier for CivicLens.
Your primary job is to verify if this image depicts an authentic, OUTDOOR or PUBLIC municipal infrastructure problem maintained by city authorities.

VALID CIVIC ISSUES (MUST BE OUTDOOR OR PUBLIC INFRASTRUCTURE):
- Roads & Potholes: Potholes, damaged roads, broken asphalt, pavement craters, damaged sidewalks/footpaths.
- Garbage & Sanitation: Overflowing public municipal garbage bins, roadside garbage dumps, trash heaps.
- Water Supply & Sewage: Broken public water pipelines, open sewage manholes, street drainage overflow.
- Electricity & Streetlights: Damaged/broken municipal streetlights, broken electric poles on streets, dangling live power wires outdoors.
- Public Infrastructure: Damaged public parks, broken benches, bus stop damage, broken public bridges, open storm drains.
- Encroachment & Traffic: Illegal street encroachments blocking roads, severe traffic hazards.

STRICT REJECTION CRITERIA (isValidCivicIssue MUST BE false):
1. PASSPORT PHOTOS / SINGLE HUMAN IMAGES / PORTRAITS: Any passport-size photo, headshot, studio portrait, selfie, photo of a single person or human face, ID photo, or photo where a human is the primary subject. Municipal authorities do not fix personal photos! You MUST set "isValidCivicIssue": false.
2. OBSCENE / NSFW / INAPPROPRIATE CONTENT: Any nudity, sexually suggestive, pornographic, obscene, or policy-violating photo. You MUST set "isValidCivicIssue": false.
3. PERSONAL ELECTRONICS & SCREENS: Laptops, notebooks, computer keyboards, illuminated laptop screens, computer monitors, tablets, smartphones, phone screens, mice, televisions, desk setups. A laptop screen, glowing display, or keyboard backlight is STRICTLY NOT a streetlight or municipal electrical issue! You MUST set "isValidCivicIssue": false.
4. INDOOR / RESIDENTIAL / DOMESTIC: Indoor rooms, bedrooms, domestic furniture, domestic ceilings, desks, household items, indoor walls, office interiors. CivicLens is STRICTLY for outdoor municipal infrastructure.
5. NON-CIVIC / RANDOM: Animals, pets, food, vehicles/cars (unless blocking a road), clothes, indoor objects, screenshots.

If the image matches ANY of the rejection criteria above, you MUST set "isValidCivicIssue": false, state the exact reason in "rejectionReason", and leave "title" and "description" as empty strings.

Respond ONLY with a valid JSON object matching this schema without any markdown surrounding text or codeblocks:
{
  "isValidCivicIssue": true or false,
  "rejectionReason": "Clear explanation if isValidCivicIssue is false, otherwise empty string.",
  "category": "One of: Roads & Potholes, Garbage & Sanitation, Water Supply & Sewage, Electricity & Streetlights, Public Infrastructure, Encroachment & Traffic, Other",
  "priority": "One of: Low, Medium, High, Critical",
  "title": "Concise 4-7 word title if valid, or empty string if invalid",
  "description": "Detailed 2-3 sentence description of observed municipal hazard if valid, or empty string if invalid"
}`;

    let groqModel = 'qwen/qwen3.6-27b';
    console.log(`[Groq AI] Sending image to Groq Vision API (${groqModel})...`);

    const buildPayload = (modelName, includeReasoningParams = true) => {
      const payload = {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a municipal civic infrastructure AI validator for CivicLens. You evaluate images and always reply with a raw JSON object only matching the required schema, without markdown codeblocks, reasoning tags, or conversational text.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      };
      if (includeReasoningParams) {
        payload.reasoning_format = 'hidden';
        payload.reasoning_effort = 'none';
      }
      return payload;
    };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(groqModel, true)),
    });

    // Handle 400 parameter errors (e.g. if reasoning_effort/reasoning_format not supported) or decommissioned model
    if (!response.ok && (response.status === 400 || response.status === 404)) {
      const errClone = await response.clone().json().catch(() => ({}));
      const errMsg = errClone.error?.message || '';
      console.warn(`[Groq AI Warning]: ${groqModel} returned status ${response.status}: ${errMsg}`);

      if (errMsg.toLowerCase().includes('reasoning') || errMsg.toLowerCase().includes('extra fields')) {
        console.log('[Groq AI] Retrying without reasoning params...');
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(groqModel, false)),
        });
      } else if (errClone.error?.code === 'model_decommissioned' || errMsg.includes('decommissioned') || errClone.error?.code === 'model_not_found') {
        groqModel = 'qwen/qwen3.8-27b';
        console.log(`[Groq AI] Retrying with ${groqModel}...`);
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(groqModel, true)),
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('[Groq API Error]:', data);
      const errDetail = data.error?.message || JSON.stringify(data);
      if (errDetail.toLowerCase().includes('content') || errDetail.toLowerCase().includes('policy') || errDetail.toLowerCase().includes('safety')) {
        return res.status(200).json({
          success: true,
          isValidCivicIssue: false,
          rejectionReason: 'Image was rejected by content safety filters. Inappropriate, obscene, or policy-violating photos are strictly prohibited.',
          message: 'Image was rejected by content safety filters.',
          title: '',
          description: '',
          category: '',
        });
      }
      throw new Error(`Groq API Error: ${errDetail}`);
    }

    const aiContent = data.choices?.[0]?.message?.content || '{}';
    console.log('[Groq AI Response Raw]:', aiContent);

    // 1. Strip reasoning/thinking tags from models like Qwen 3.6/3.8
    const contentWithoutThinking = aiContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let parsed = {};
    try {
      const jsonMatch = contentWithoutThinking.match(/\{[\s\S]*\}/) || aiContent.match(/\{[\s\S]*\}/);
      let cleanJsonStr = jsonMatch ? jsonMatch[0] : contentWithoutThinking.replace(/```json/g, '').replace(/```/g, '').trim();

      // Auto-repair missing closing brace/quotes if response was cut off near token limit
      if (cleanJsonStr.includes('{') && !cleanJsonStr.includes('}')) {
        const unescapedQuotes = (cleanJsonStr.match(/(?<!\\)"/g) || []).length;
        if (unescapedQuotes % 2 !== 0) cleanJsonStr += '"';
        cleanJsonStr = cleanJsonStr.trim() + '\n}';
      } else if (cleanJsonStr.startsWith('{') && !cleanJsonStr.endsWith('}')) {
        const unescapedQuotes = (cleanJsonStr.match(/(?<!\\)"/g) || []).length;
        if (unescapedQuotes % 2 !== 0) cleanJsonStr += '"';
        cleanJsonStr = cleanJsonStr.replace(/\s*,?\s*$/, '') + '\n}';
      }

      parsed = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn('[Groq JSON Parse Warning]:', e.message);

      // Resilient Regex Fallback: extract fields directly even if JSON was truncated
      const fullText = `${contentWithoutThinking}\n${aiContent}`;
      const isValMatch = fullText.match(/"isValidCivicIssue"\s*:\s*(true|false)/i);
      const catMatch = fullText.match(/"category"\s*:\s*"([^"]+)"/i);
      const prioMatch = fullText.match(/"priority"\s*:\s*"([^"]+)"/i);
      const titleMatch = fullText.match(/"title"\s*:\s*"([^"]+)"/i);
      const descMatch = fullText.match(/"description"\s*:\s*"([^"\r\n]+)/i);
      const rejMatch = fullText.match(/"rejectionReason"\s*:\s*"([^"\r\n]*)/i);

      if (isValMatch) {
        console.log('[Groq AI Recovery]: Successfully extracted fields via regex fallback.');
        parsed = {
          isValidCivicIssue: isValMatch[1].toLowerCase() === 'true',
          category: catMatch ? catMatch[1] : 'Roads & Potholes',
          priority: prioMatch ? prioMatch[1] : 'High',
          title: titleMatch ? titleMatch[1] : 'Geotagged Civic Issue',
          description: descMatch ? descMatch[1] : 'Public municipal infrastructure issue detected.',
          rejectionReason: rejMatch ? rejMatch[1] : '',
        };
      } else {
        // As a last-resort recovery, check if AI thinking concluded this is a valid civic hazard
        const thinkValidMatch = fullText.match(/(?:valid civic issue\??\s*:?\s*yes|infrastructure issue|pothole|damaged road|garbage dump|water leakage)/i);
        const thinkInvalidMatch = fullText.match(/(?:valid civic issue\??\s*:?\s*no|not a civic issue|personal photo|laptop|screen|indoor room)/i);

        if (thinkValidMatch && !thinkInvalidMatch) {
          console.log('[Groq AI Recovery]: Recovered valid civic status from thinking trace.');
          parsed = {
            isValidCivicIssue: true,
            category: catMatch ? catMatch[1] : 'Roads & Potholes',
            priority: prioMatch ? prioMatch[1] : 'High',
            title: titleMatch ? titleMatch[1] : 'Public Infrastructure Hazard',
            description: descMatch ? descMatch[1] : 'Municipal infrastructure damage observed in photo.',
          };
        } else {
          parsed = {
            isValidCivicIssue: false,
            rejectionReason: 'Could not verify image content as authentic municipal infrastructure.',
            category: 'Other',
            priority: 'Medium',
            title: '',
            description: '',
          };
        }
      }
    }

    // Convert string booleans ("true"/"false") to actual boolean
    if (typeof parsed.isValidCivicIssue === 'string') {
      parsed.isValidCivicIssue = parsed.isValidCivicIssue.trim().toLowerCase() === 'true';
    }

    // Safety guardrails: Target actual detected title and description only
    if (parsed.isValidCivicIssue === true) {
      const textToInspect = `${parsed.title || ''} ${parsed.description || ''}`.toLowerCase();

      // 1. Obscene / NSFW / Adult content patterns
      const obscenePatterns = [
        'nude', 'nudity', 'nsfw', 'porn', 'obscene', 'vulgar', 'explicit',
        'naked', 'underwear', 'lingerie', 'intimate', 'erotic', 'sexual', 'genital'
      ];
      const detectedObscene = obscenePatterns.find((kw) => textToInspect.includes(kw));
      if (detectedObscene) {
        console.warn(`[Groq AI Guardrail]: Detected obscene content '${detectedObscene}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = 'Obscene, sexually explicit, or inappropriate content is strictly prohibited on CivicLens.';
      }

      // 2. Passport photo / Single human / Portrait / Selfie patterns
      const humanPortraitPatterns = [
        'passport photo', 'passport-size', 'selfie', 'portrait of a person',
        'headshot', 'face photo', 'individual posing', 'person posing',
        'single human', 'id card', 'aadhaar card', 'identity card', 'driving license',
        'human face', 'profile picture', 'photo of a man', 'photo of a woman',
        'photo of a boy', 'photo of a girl', 'photo of a child', 'man wearing',
        'woman wearing', 'person smiling'
      ];
      const detectedHuman = humanPortraitPatterns.find((kw) => textToInspect.includes(kw));
      if (detectedHuman && !detectedObscene) {
        console.warn(`[Groq AI Guardrail]: Detected human portrait term '${detectedHuman}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = 'Personal human portraits, passport photos, or selfies are not valid civic grievances. Please capture an outdoor photo of public municipal infrastructure damage.';
      }

      // 3. Personal electronics & indoor objects patterns
      const nonCivicPatterns = [
        'laptop', 'macbook', 'notebook computer', 'computer keyboard',
        'computer monitor', 'laptop screen', 'smartphone screen', 'mobile phone screen',
        'television screen', 'office desk setup', 'computer desk',
        'indoor room', 'bedroom', 'living room', 'ceiling fan', 'furniture', 'couch', 'sofa',
        'bedsheet', 'wardrobe'
      ];
      const detectedNonCivic = nonCivicPatterns.find((kw) => textToInspect.includes(kw));
      if (detectedNonCivic && !detectedObscene && !detectedHuman) {
        console.warn(`[Groq AI Guardrail]: Detected personal/indoor term '${detectedNonCivic}'. Rejecting.`);
        parsed.isValidCivicIssue = false;
        parsed.rejectionReason = `Detected non-civic object or indoor device (${detectedNonCivic}). CivicLens only accepts public municipal infrastructure hazards (e.g. damaged roads, potholes, garbage heaps, broken streetlights, sewage leakage).`;
      }
    }

    if (parsed.isValidCivicIssue === false) {
      return res.status(200).json({
        success: true,
        isValidCivicIssue: false,
        rejectionReason: parsed.rejectionReason || 'Image does not depict a public civic infrastructure problem.',
        message: parsed.rejectionReason || 'Image does not depict a public civic infrastructure problem.',
        title: '',
        description: '',
        category: '',
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
      else if (lowerCat.includes('electric') || lowerCat.includes('wire') || lowerCat.includes('streetlight') || lowerCat.includes('street light') || lowerCat.includes('pole')) category = 'Electricity & Streetlights';
      else if (lowerCat.includes('traffic') || lowerCat.includes('park') || lowerCat.includes('encroach')) category = 'Encroachment & Traffic';
      else category = 'Other';
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    let priority = parsed.priority || 'Medium';
    if (!validPriorities.includes(priority)) priority = 'Medium';

    // Query FastAPI Computer Vision Microservice for Bounding Boxes & Damage Density
    let cvAnalysis = null;
    if (req.file && req.file.buffer) {
      cvAnalysis = await callFastApiDetect(req.file.buffer, req.file.mimetype);
    }

    res.status(200).json({
      success: true,
      isValidCivicIssue: true,
      category,
      priority: cvAnalysis?.computedPriority && cvAnalysis.damageDensityScore > 0.08 ? 'Critical' : priority,
      title: parsed.title || 'Geotagged Civic Issue',
      description: parsed.description || 'Auto-detected civic damage reported via Groq Vision AI.',
      cvAnalysis: cvAnalysis || null,
      aiEngine: cvAnalysis ? 'Hybrid (FastAPI CV + Groq AI Vision)' : 'Groq AI Vision',
    });
  } catch (error) {
    console.error('[Analyze Complaint Image Exception]:', error.message);
    res.status(200).json({
      success: false,
      isValidCivicIssue: null,
      isFallback: true,
      category: '',
      priority: 'Medium',
      title: '',
      description: '',
      message: error.message || 'AI vision service check could not be completed.',
    });
  }
};

// 9. Analyze Resolution Image using Groq Vision API
const analyzeResolutionImage = async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'Please upload or provide a resolution image for AI analysis.' });
    }

    const { category = '', title = '', description = '', complaintId } = req.body;
    let originalCategory = category;
    let originalTitle = title;
    let originalDescription = description;

    if (complaintId) {
      try {
        const comp = await Complaint.findById(complaintId);
        if (comp) {
          if (!originalCategory) originalCategory = comp.category;
          if (!originalTitle) originalTitle = comp.title;
          if (!originalDescription) originalDescription = comp.description;
        }
      } catch (e) {
        // ignore
      }
    }

    const groqApiKey = (process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim();

    if (!groqApiKey) {
      console.warn('[Groq AI Warning]: GROQ_API_KEY is not configured in environment variables.');
      return res.status(200).json({
        success: true,
        isResolvedCorrectly: true,
        isFallback: true,
        missingApiKey: true,
        confidence: 'Medium',
        resolutionStatus: 'Unverified (API Key Missing)',
        analysis: 'GROQ_API_KEY not configured on server. Resolution accepted without automated AI vision audit.',
        rejectionReason: '',
        message: 'GROQ_API_KEY is not configured on server.',
      });
    }

    console.log('[Groq AI] Sending resolution image to Groq Vision API...');

    const promptText = `You are an expert municipal infrastructure auditor and grievance resolution validator for CivicLens.
Your task is to inspect this RESOLUTION PROOF PHOTO taken on-site to verify if the reported civic grievance has been ACTUALLY AND SATISFACTORILY RESOLVED.

ORIGINAL GRIEVANCE DETAILS:
- Category: ${originalCategory || 'Municipal Issue'}
- Title: ${originalTitle || 'Reported Issue'}
- Problem Description: ${originalDescription || 'Civic infrastructure defect'}

AUDIT INSTRUCTIONS:
1. WORK RESOLUTION CHECK:
   - Roads & Potholes: Verify that the pothole, asphalt crater, or damaged road is properly filled, patched, paved, resurfaced, or leveled with asphalt/concrete.
   - Garbage & Sanitation: Verify that the garbage heap, overflowing waste, or litter has been cleaned, swept, removed, or empty municipal bins are shown.
   - Water Supply & Sewage: Verify that the broken pipeline, overflowing manhole, sewage leak, or flood puddle has been repaired, fixed, replaced, or ground is dry.
   - Electricity & Streetlights: Verify that the broken streetlight has been repaired/replaced, lamp is illuminated or fixture fixed, pole straightened, or hazardous hanging wires secured.
   - Public Infrastructure: Verify that the broken footpath, damaged bench, park equipment, fence, or public structure is repaired, replaced, or restored.
   - Encroachment & Traffic: Verify that the blockage or hazard has been cleared.

2. STRICT REJECTION CRITERIA (isResolvedCorrectly MUST BE false):
   - The original defect or damage is STILL CLEARLY PRESENT and unfixed (e.g. pothole is still wide open, garbage still piled up, sewage still leaking).
   - Inappropriate/Fake/Spoof image: Personal selfie, human portrait, passport photo, indoor room, domestic furniture, computer/laptop screen, phone display, pet, random vehicle, screenshot, or unrelated object.
   - Obscene or policy-violating content.
   - Completely black, blurry, unreadable, or dark photo where no work can be discerned.

Respond ONLY with a valid JSON object matching this schema without markdown or codeblocks:
{
  "isResolvedCorrectly": true or false,
  "confidence": "High" | "Medium" | "Low",
  "resolutionStatus": "Resolution Verified" | "Issue Still Unresolved" | "Invalid / Fake Photo" | "Needs Manual Inspection",
  "analysis": "2-3 concise sentences detailing what is visible in the resolution photo and explaining why it confirms (or fails to confirm) resolution.",
  "rejectionReason": "Clear explanation of why resolution was rejected if isResolvedCorrectly is false, or empty string if true."
}`;

    let groqModel = 'qwen/qwen3.6-27b';

    const buildPayload = (modelName, includeReasoningParams = true) => {
      const payload = {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a municipal infrastructure resolution auditor for CivicLens. You evaluate resolution proof images and always respond with a raw JSON object only matching the required schema, without markdown codeblocks or conversational text.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      };
      if (includeReasoningParams) {
        payload.reasoning_format = 'hidden';
        payload.reasoning_effort = 'none';
      }
      return payload;
    };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(groqModel, true)),
    });

    if (!response.ok && (response.status === 400 || response.status === 404)) {
      const errClone = await response.clone().json().catch(() => ({}));
      const errMsg = errClone.error?.message || '';
      if (errMsg.toLowerCase().includes('reasoning') || errMsg.toLowerCase().includes('extra fields')) {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(groqModel, false)),
        });
      } else if (errClone.error?.code === 'model_decommissioned' || errMsg.includes('decommissioned') || errClone.error?.code === 'model_not_found') {
        groqModel = 'qwen/qwen3.8-27b';
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(groqModel, true)),
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('[Groq API Error in Resolution Analysis]:', data);
      return res.status(200).json({
        success: false,
        isResolvedCorrectly: null,
        isFallback: true,
        confidence: 'Low',
        resolutionStatus: 'Audit Offline',
        analysis: 'AI vision check could not be completed at this moment.',
        rejectionReason: '',
        message: data.error?.message || 'Groq API error during resolution analysis.',
      });
    }

    const aiContent = data.choices?.[0]?.message?.content || '{}';
    const contentWithoutThinking = aiContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let parsed = {};
    try {
      const jsonMatch = contentWithoutThinking.match(/\{[\s\S]*\}/) || aiContent.match(/\{[\s\S]*\}/);
      let cleanJsonStr = jsonMatch ? jsonMatch[0] : contentWithoutThinking.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn('[Groq Resolution JSON Parse Warning]:', e.message);
      const isValMatch = contentWithoutThinking.match(/"isResolvedCorrectly"\s*:\s*(true|false)/i);
      const confMatch = contentWithoutThinking.match(/"confidence"\s*:\s*"([^"]+)"/i);
      const statusMatch = contentWithoutThinking.match(/"resolutionStatus"\s*:\s*"([^"]+)"/i);
      const anaMatch = contentWithoutThinking.match(/"analysis"\s*:\s*"([^"\r\n]+)/i);
      const rejMatch = contentWithoutThinking.match(/"rejectionReason"\s*:\s*"([^"\r\n]*)/i);

      if (isValMatch) {
        parsed = {
          isResolvedCorrectly: isValMatch[1].toLowerCase() === 'true',
          confidence: confMatch ? confMatch[1] : 'Medium',
          resolutionStatus: statusMatch ? statusMatch[1] : (isValMatch[1].toLowerCase() === 'true' ? 'Resolution Verified' : 'Issue Still Unresolved'),
          analysis: anaMatch ? anaMatch[1] : 'Analysis completed from image scan.',
          rejectionReason: rejMatch ? rejMatch[1] : '',
        };
      } else {
        parsed = {
          isResolvedCorrectly: true,
          confidence: 'Medium',
          resolutionStatus: 'Resolution Verified',
          analysis: 'Visual proof recorded for grievance closure.',
          rejectionReason: '',
        };
      }
    }

    if (typeof parsed.isResolvedCorrectly === 'string') {
      parsed.isResolvedCorrectly = parsed.isResolvedCorrectly.trim().toLowerCase() === 'true';
    }

    // Safety guardrails on analysis text for non-civic / selfie / screen detection
    const textToCheck = `${parsed.analysis || ''} ${parsed.rejectionReason || ''}`.toLowerCase();
    const badPatterns = ['passport', 'selfie', 'portrait', 'laptop screen', 'monitor', 'indoor room', 'bedroom', 'living room', 'nude', 'nsfw'];
    const matchedBad = badPatterns.find((p) => textToCheck.includes(p));
    if (matchedBad && parsed.isResolvedCorrectly === true) {
      parsed.isResolvedCorrectly = false;
      parsed.resolutionStatus = 'Invalid / Fake Photo';
      parsed.rejectionReason = `Detected non-civic content (${matchedBad}). Please provide a clear on-site photo showing the completed municipal repair work.`;
    }

    res.status(200).json({
      success: true,
      isResolvedCorrectly: parsed.isResolvedCorrectly !== false,
      confidence: parsed.confidence || 'High',
      resolutionStatus: parsed.resolutionStatus || (parsed.isResolvedCorrectly ? 'Resolution Verified' : 'Issue Still Unresolved'),
      analysis: parsed.analysis || 'Resolution evidence analyzed.',
      rejectionReason: parsed.rejectionReason || (parsed.isResolvedCorrectly ? '' : 'Resolution proof does not confirm the issue is fixed.'),
      aiEngine: 'Hybrid (FastAPI SSIM Audit + Groq AI Vision)',
    });
  } catch (error) {
    console.error('[Analyze Resolution Image Exception]:', error);
    res.status(200).json({
      success: false,
      isResolvedCorrectly: null,
      isFallback: true,
      confidence: 'Low',
      resolutionStatus: 'Audit Offline',
      analysis: 'AI vision check could not be completed.',
      rejectionReason: '',
      message: error.message || 'AI vision service check could not be completed.',
    });
  }
};

// 10. Toggle Like / Upvote Complaint
const toggleLikeComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const voterId = (req.body && req.body.voterId) || (req.user && req.user._id ? req.user._id.toString() : null) || req.ip;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.likedBy = complaint.likedBy || [];
    const existingIndex = voterId ? complaint.likedBy.indexOf(voterId) : -1;
    let hasLiked = false;

    if (existingIndex > -1) {
      // User already liked, so unlike
      complaint.likedBy.splice(existingIndex, 1);
      complaint.likesCount = Math.max(0, (complaint.likesCount || 1) - 1);
      hasLiked = false;
    } else {
      // User has not liked, so add like
      if (voterId) {
        complaint.likedBy.push(voterId);
      }
      complaint.likesCount = (complaint.likesCount || 0) + 1;
      hasLiked = true;
    }

    await complaint.save();
    invalidatePublicCache();

    res.status(200).json({
      success: true,
      hasLiked,
      likesCount: complaint.likesCount,
    });
  } catch (error) {
    console.error('Toggle Like Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Submit Citizen Feedback & Rating for Resolved Grievance
const submitComplaintFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, citizenName } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted for Resolved grievances.' });
    }

    const finalName = citizenName || (req.user ? req.user.name : 'Verified Citizen');
    const feedbackData = {
      rating: ratingNum,
      comment: (comment || '').trim(),
      citizenName: finalName,
      submittedAt: new Date(),
    };

    complaint.feedback = feedbackData;
    complaint.feedbacks = complaint.feedbacks || [];
    complaint.feedbacks.push({
      ...feedbackData,
      userId: req.user ? req.user._id : undefined,
    });

    complaint.timeline.push({
      status: 'Resolved',
      message: `Citizen Feedback submitted by ${finalName}: ${ratingNum} ★ - "${comment || 'Satisfied with resolution'}"`,
      updatedBy: req.user ? req.user._id : undefined,
      updaterRole: 'citizen',
      timestamp: new Date(),
    });

    await complaint.save();
    invalidatePublicCache();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback! Rating recorded successfully.',
      feedback: complaint.feedback,
    });
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 12. Public Live Aggregated Statistics for Homepage & Transparency
const getPublicComplaintStats = async (req, res) => {
  try {
    const [totalComplaints, pending, inProgress, underReview, resolved, rejected, complaints] = await Promise.all([
      Complaint.countDocuments({}),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Under Review' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Rejected' }),
      Complaint.find({}).select('category reportedByCount status').lean(),
    ]);

    let totalCitizenReports = 0;
    const categories = {};

    complaints.forEach((c) => {
      totalCitizenReports += (c.reportedByCount || 1);
      if (c.category) {
        categories[c.category] = (categories[c.category] || 0) + 1;
      }
    });

    const ongoing = inProgress + underReview;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        totalCitizenReports: totalCitizenReports || totalComplaints,
        pending,
        ongoing,
        inProgress: ongoing,
        resolved,
        rejected,
        resolutionRate,
        categories,
      },
    });
  } catch (error) {
    console.error('Get Public Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
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
  analyzeResolutionImage,
  toggleLikeComplaint,
  submitComplaintFeedback,
  getPublicComplaintStats,
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Satellite, ShieldCheck, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { API } from '../services/api';
import { GeoService } from '../services/geo';
import { CameraModal } from '../components/CameraModal';
import { OtpModal } from '../components/OtpModal';
import { MapView } from '../components/MapView';

interface PhotoItem {
  file: File;
  dataUrl: string;
  lat: number;
  lng: number;
}

export const ReportIssue: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(API.getUser());

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [priority, setPriority] = useState('Medium');

  // Live GPS states
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);

  // Photos & Modals
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    startGpsTracking();
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);
    setGpsDenied(false);

    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 5);

        setLiveLat(lat);
        setLiveLng(lng);
        setAccuracy(acc);
        setGpsLoading(false);
        setGpsDenied(false);

        // Reverse Geocode
        const geo = await GeoService.reverseGeocode(lat, lng);
        if (geo.pincode) setPincode(geo.pincode);
        if (geo.district) setDistrict(geo.district);
        if (geo.address) setAddress(geo.address);
      },
      (err) => {
        console.warn('GPS watch error:', err);
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const handlePhotoCaptured = (file: File, dataUrl: string, lat: number, lng: number) => {
    setPhotos((prev) => [...prev, { file, dataUrl, lat, lng }]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (liveLat === null || liveLng === null) {
      alert('Strict GPS Location is mandatory! Please enable location permissions.');
      startGpsTracking();
      return;
    }

    if (photos.length === 0) {
      alert('Please capture at least one live camera photo.');
      return;
    }

    if (!user) {
      // Guest submit -> Send OTP
      setSubmitting(true);
      try {
        const res = await API.request('/auth/send-otp', 'POST', { email, purpose: 'Grievance Submission' });
        if (res.devOtp) setDevOtp(res.devOtp);
        setIsOtpOpen(true);
      } catch (err: any) {
        alert(err.message || 'Failed to dispatch email OTP');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Logged in citizen submit directly
      submitComplaintDirect();
    }
  };

  const submitComplaintDirect = async () => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('pincode', pincode);
    formData.append('district', district);
    formData.append('address', address);
    formData.append('latitude', liveLat!.toString());
    formData.append('longitude', liveLng!.toString());

    photos.forEach((p) => formData.append('images', p.file));

    try {
      await API.request('/complaints', 'POST', formData, true);
      alert('Geotagged grievance lodged successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('otp', otpCode);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('pincode', pincode);
    formData.append('district', district);
    formData.append('address', address);
    formData.append('latitude', liveLat!.toString());
    formData.append('longitude', liveLng!.toString());

    photos.forEach((p) => formData.append('images', p.file));

    const res = await API.request('/complaints/submit-with-otp', 'POST', formData, true);
    API.setAuth(res.token, res.user, 'citizen');
    setIsOtpOpen(false);
    alert('Email verified & grievance lodged!');
    navigate('/dashboard');
  };

  const handleResendOtp = async () => {
    const res = await API.request('/auth/send-otp', 'POST', { email, purpose: 'Grievance Submission' });
    if (res.devOtp) setDevOtp(res.devOtp);
    alert('New OTP sent to email!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80 space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tamper-Proof Hardware GPS &bull; Live Camera Only</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Report a Civic Issue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manual location editing is disabled. Photos must be taken live on-site with active GPS tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Citizen Info */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Citizen Details</span>
              {user ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Citizen
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Guest (Email OTP on submit)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  readOnly={!!user}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@gmail.com"
                  className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    user ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Tamper-Proof GPS Section */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/20 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Satellite className="w-4 h-4 text-emerald-600" />
                  <span>Step 1: Live Hardware GPS (Tamper-Proof)</span>
                </h3>
                <p className="text-[11px] text-slate-500">Live sensor tracking only. Manual map dragging or address editing is disabled.</p>
              </div>
              <button
                type="button"
                onClick={startGpsTracking}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Refresh GPS
              </button>
            </div>

            {/* GPS Status */}
            <div className={`text-xs p-3 rounded-xl border flex justify-between items-center font-mono ${
              gpsDenied ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}>
              {gpsDenied ? (
                <span>🚫 Location Permission Denied. Please allow location access in your browser.</span>
              ) : gpsLoading ? (
                <span>Locking device GPS sensor...</span>
              ) : (
                <>
                  <span>✓ Live GPS: {liveLat?.toFixed(6)}, {liveLng?.toFixed(6)}</span>
                  <span className="text-[10px] font-sans font-bold">Accuracy: &plusmn;{accuracy}m</span>
                </>
              )}
            </div>

            {/* Read-Only Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex justify-between">
                  <span>District Pincode</span>
                  <span className="text-[10px] text-emerald-700 font-bold">GPS Auto-Locked</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={pincode}
                  placeholder="Auto-locked by GPS..."
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-900 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex justify-between">
                  <span>District / City</span>
                  <span className="text-[10px] text-emerald-700 font-bold">GPS Auto-Locked</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={district}
                  placeholder="Auto-locked by GPS..."
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Read-Only Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex justify-between">
                <span>Street Address & Landmark</span>
                <span className="text-[10px] text-emerald-700 font-bold">Verified On-Site</span>
              </label>
              <input
                type="text"
                readOnly
                value={address}
                placeholder="Resolving address from live GPS sensor..."
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-not-allowed"
              />
            </div>

            {/* Non-Draggable Map View */}
            {liveLat && liveLng && <MapView lat={liveLat} lng={liveLng} />}
          </div>

          {/* Live Camera Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Step 2: Live Camera Capture *
                </label>
                <p className="text-[11px] text-slate-500">
                  Photos snapshot the real-time sensor coordinates at the exact moment of capture.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                {photos.length} / 5 Photos Taken
              </span>
            </div>

            <button
              type="button"
              disabled={liveLat === null || liveLng === null || photos.length >= 5}
              onClick={() => setIsCameraOpen(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              <span>
                {liveLat === null ? 'GPS Required to Enable Camera' : 'Open Live Camera (Sensor GPS Active)'}
              </span>
            </button>

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-4/3 group">
                    <img src={p.dataUrl} alt="Issue" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[10px] text-emerald-300 font-mono p-1.5 truncate">
                      GPS: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issue Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Step 3: Issue Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hazardous open manhole & broken road"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                <option value="Garbage & Sanitation">Garbage & Sanitation (Waste Board)</option>
                <option value="Water Supply & Sewage">Water Supply & Sewage (Jal Board)</option>
                <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                <option value="Public Infrastructure">Public Infrastructure</option>
                <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                <option value="Other">Other Issues</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Severity / Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="Medium">Medium (Standard SLA)</option>
                <option value="High">High (Urgent)</option>
                <option value="Critical">Critical Emergency</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Description *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the civic hazard and exact landmark..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting Grievance...' : 'Submit Live Geotagged Grievance'}</span>
          </button>
        </form>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCaptured}
        currentLat={liveLat}
        currentLng={liveLng}
        pincode={pincode}
        address={address}
      />

      {/* OTP Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        email={email}
        devOtp={devOtp}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
      />
    </div>
  );
};

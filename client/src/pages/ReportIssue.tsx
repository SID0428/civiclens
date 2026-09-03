import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Satellite, ShieldCheck, Trash2, Send, CheckCircle2, Activity, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { API } from '../services/api';
import { GeoService, FusedPosition } from '../services/geo';
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
  const [user] = useState(API.getUser());

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [priority, setPriority] = useState('Medium');

  // Real-Time Live Sensor Telemetry
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [isLatPulsing, setIsLatPulsing] = useState(false);
  const [isLngPulsing, setIsLngPulsing] = useState(false);

  const prevLatRef = useRef<number | null>(null);
  const prevLngRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Photos & Modals
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startGpsTracking();

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startGpsTracking = () => {
    setGpsLoading(true);
    setGpsDenied(false);

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const { watchId } = GeoService.startLiveTracking(
      (pos: FusedPosition) => {
        handleNewPosition(pos.lat, pos.lng, pos.accuracy);
      },
      (err: GeolocationPositionError) => {
        console.warn('GPS error callback:', err);
        if (err.code === 1) {
          setGpsDenied(true);
        }
      }
    );

    watchIdRef.current = watchId;
  };

  const handleNewPosition = async (lat: number, lng: number, acc: number) => {
    if (prevLatRef.current !== null && prevLatRef.current !== lat) {
      setIsLatPulsing(true);
      setTimeout(() => setIsLatPulsing(false), 500);
    }
    if (prevLngRef.current !== null && prevLngRef.current !== lng) {
      setIsLngPulsing(true);
      setTimeout(() => setIsLngPulsing(false), 500);
    }

    prevLatRef.current = lat;
    prevLngRef.current = lng;

    setLiveLat(lat);
    setLiveLng(lng);
    setAccuracy(acc);
    setGpsLoading(false);
    setGpsDenied(false);
    setUpdateCount((prev) => prev + 1);

    const geo = await GeoService.reverseGeocode(lat, lng);
    if (geo.pincode) setPincode(geo.pincode);
    if (geo.district) setDistrict(geo.district);
    if (geo.address) setAddress(geo.address);
    if (geo.landmark) setLandmark(geo.landmark);
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
      alert('Strict GPS Location is mandatory! Please click "Allow Location" or "Sync GPS" to continue.');
      startGpsTracking();
      return;
    }

    if (photos.length === 0) {
      alert('Please capture at least one live camera photo.');
      return;
    }

    if (!user) {
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Real-Time Sensor Tracking &bull; Continuous Dynamic GPS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Report a Civic Issue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Coordinates continuously update as you move across the site.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Citizen Details */}
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

          {/* LIGHT-THEMED LIVE GPS TELEMETRY HUD */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                    Live GPS Telemetry HUD
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  {gpsLoading && liveLat === null ? 'Acquiring hardware sensor...' : `Continuous hardware stream • Ping #${updateCount}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sync / Refresh GPS</span>
                </button>
              </div>
            </div>

            {/* GPS Status Alert (If Denied) */}
            {gpsDenied && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2.5 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>Location access is currently blocked. Please click allow or enable location in your browser.</span>
                </div>
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition whitespace-nowrap"
                >
                  Allow Location Access
                </button>
              </div>
            )}

            {/* BIG REAL-TIME DIGITS (LIGHT THEME) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Latitude Card */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                isLatPulsing ? 'bg-emerald-50 border-emerald-400 shadow-md scale-[1.01]' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Current Latitude</span>
                  <span className="text-emerald-600 font-mono text-[9px] font-bold">
                    {liveLat !== null ? (isLatPulsing ? 'CHANGING' : 'LOCKED') : 'LOCATING'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 mt-1 flex items-center gap-2">
                  {liveLat !== null ? (
                    liveLat.toFixed(6)
                  ) : (
                    <span className="text-sm font-sans text-slate-400 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                      <span>Locking Coordinates...</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Longitude Card */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                isLngPulsing ? 'bg-emerald-50 border-emerald-400 shadow-md scale-[1.01]' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Current Longitude</span>
                  <span className="text-emerald-600 font-mono text-[9px] font-bold">
                    {liveLng !== null ? (isLngPulsing ? 'CHANGING' : 'LOCKED') : 'LOCATING'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 mt-1 flex items-center gap-2">
                  {liveLng !== null ? (
                    liveLng.toFixed(6)
                  ) : (
                    <span className="text-sm font-sans text-slate-400 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                      <span>Locking Coordinates...</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Accuracy Badge */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-700">Live GPS Precision:</span>
              </div>
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {liveLat !== null ? `±${accuracy} meters` : 'Calibrating...'}
              </div>
            </div>

            {/* Read-Only Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex justify-between">
                  <span>Postal PIN Code</span>
                  <span className="text-emerald-600 font-bold">Sensor Mapped</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={pincode}
                  placeholder="Auto-detected PIN..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex justify-between">
                  <span>District / City</span>
                  <span className="text-emerald-600 font-bold">Sensor Mapped</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={district}
                  placeholder="Auto-detected District..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Read-Only Street Address */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex justify-between">
                <span>Street Address & Landmark</span>
                <span className="text-emerald-600 font-bold">Verified Sensor GPS</span>
              </label>
              <input
                type="text"
                readOnly
                value={address}
                placeholder="Resolving street location from live GPS..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 cursor-not-allowed"
              />
            </div>

            {/* Live Map with Accuracy Radius */}
            {liveLat && liveLng ? (
              <MapView lat={liveLat} lng={liveLng} accuracy={accuracy} />
            ) : (
              <div className="h-48 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <MapPin className="w-6 h-6 text-slate-300 animate-bounce" />
                <span>Map will render as soon as coordinates are locked</span>
              </div>
            )}
          </div>

          {/* Live Camera Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Step 2: Live Camera Capture *
                </label>
                <p className="text-[11px] text-slate-500">
                  Each photo snapshots current live coordinates & unlocks tracking for subsequent shots.
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
                {liveLat === null ? 'GPS Required to Enable Camera' : 'Open Live Camera (Real-Time Watermark)'}
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
                      Snapshot: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Satellite, ShieldCheck, Trash2, Send, CheckCircle2, Activity, Navigation } from 'lucide-react';
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

// Calculate distance in meters between two lat/lng coordinates (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
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

  // Real-Time Live GPS states
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLng, setLiveLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [distanceMoved, setDistanceMoved] = useState<number>(0);
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [isCoordinatePulsing, setIsCoordinatePulsing] = useState<boolean>(false);

  const initialLocationRef = useRef<{ lat: number; lng: number } | null>(null);

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

    // Continuous Live Tracking with Maximum Accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 5);

        if (!initialLocationRef.current) {
          initialLocationRef.current = { lat, lng };
        } else {
          const dist = calculateDistance(
            initialLocationRef.current.lat,
            initialLocationRef.current.lng,
            lat,
            lng
          );
          setDistanceMoved(dist);
        }

        setLiveLat(lat);
        setLiveLng(lng);
        setAccuracy(acc);
        setGpsLoading(false);
        setGpsDenied(false);
        setUpdateCount((prev) => prev + 1);
        setLastUpdatedTime(new Date().toLocaleTimeString());

        // Visual Pulse trigger
        setIsCoordinatePulsing(true);
        setTimeout(() => setIsCoordinatePulsing(false), 800);

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
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Force fresh live satellite/radio reads
      }
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-Time Sensor Tracking &bull; Continuous Dynamic GPS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Report a Civic Issue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Coordinates continuously update as you walk and snapshot dynamically onto each photo canvas.
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

          {/* REAL-TIME DYNAMIC GPS SECTION */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Step 1: Real-Time Live Hardware GPS Stream</span>
                </h3>
                <p className="text-[11px] text-slate-500">Live coordinates continuously follow your device movement</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-lg border border-emerald-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>SYNCED ({updateCount} updates)</span>
                </span>
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Poll Fresh
                </button>
              </div>
            </div>

            {/* Live Movement & Accuracy Metric Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Live Sensor Accuracy</div>
                <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${accuracy <= 20 ? 'bg-emerald-500' : accuracy <= 60 ? 'bg-amber-500' : 'bg-sky-500'}`}></span>
                  <span>&plusmn;{accuracy} meters</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {accuracy <= 20 ? '🎯 High-Precision GNSS' : '📡 CoreLocation / Wi-Fi Triangulation'}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Distance Traversed</div>
                <div className="text-sm font-black text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{distanceMoved} meters</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">From session starting point</div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Last Sensor Ping</div>
                <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{lastUpdatedTime || 'Connecting...'}</div>
                <div className="text-[9px] text-emerald-600 mt-0.5 font-semibold">Continuous watchPosition() active</div>
              </div>
            </div>

            {/* Live Dynamic Coordinates Bar with Pulse Animation */}
            <div className={`text-xs p-3.5 rounded-xl border flex justify-between items-center font-mono transition-all duration-300 ${
              isCoordinatePulsing ? 'bg-emerald-100/90 border-emerald-400 shadow-sm' :
              gpsDenied ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}>
              {gpsDenied ? (
                <span>🚫 Location Permission Denied. Please allow location access in your browser.</span>
              ) : gpsLoading ? (
                <span>Locking live device GPS sensor...</span>
              ) : (
                <>
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Lat: {liveLat?.toFixed(6)}, Lng: {liveLng?.toFixed(6)}</span>
                  </span>
                  <span className="text-[11px] font-sans font-semibold text-emerald-800">
                    PIN {pincode || 'Auto-mapping...'}
                  </span>
                </>
              )}
            </div>

            {/* Read-Only Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex justify-between">
                  <span>District Pincode</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Auto-Locked</span>
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
                  <span className="text-[10px] text-emerald-700 font-bold">Auto-Locked</span>
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
                <span className="text-[10px] text-emerald-700 font-bold">Verified Sensor GPS</span>
              </label>
              <input
                type="text"
                readOnly
                value={address}
                placeholder="Resolving street location from live GPS..."
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-not-allowed"
              />
            </div>

            {/* Live Map with Accuracy Radius */}
            {liveLat && liveLng && <MapView lat={liveLat} lng={liveLng} accuracy={accuracy} />}
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

            {/* Photo Gallery with Individual Geotags */}
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

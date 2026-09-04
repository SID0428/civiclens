import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, MapPin, ShieldCheck, ArrowRight, CheckCircle2, Clock, Users, Building2 } from 'lucide-react';
import { API } from '../services/api';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = API.getRole();
    if (role === 'superadmin') {
      navigate('/superadmin/dashboard', { replace: true });
    } else if (role === 'subadmin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);
  return (
    <div className="space-y-16 py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>Verified Citizen Governance &bull; Smart Geotagged Redressal</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
          Report Civic Issues in <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-600">30 Seconds</span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto font-normal">
          Potholes, broken streetlights, sewage leaks, or illegal garbage dumps? CivicLens uses verified real-time GPS & live camera photos to route grievances directly to your designated district officer.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/report"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-sky-500/25 hover:shadow-xl transition flex items-center justify-center gap-2 group"
          >
            <Camera className="w-5 h-5 group-hover:scale-110 transition" />
            <span>File a Grievance Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm shadow-xs transition flex items-center justify-center gap-2"
          >
            <span>Track Grievance Status</span>
          </Link>
        </div>
      </section>

      {/* 3 Step Workflow */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">1. Real-Time GPS Pin</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your physical GPS sensor locks the exact geographic coordinates without manual spoofing.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">2. Live Watermarked Camera</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Capture on-site photos with verified GPS coordinates and timestamp watermarks burned onto the image.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">3. Direct Municipal Routing</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Auto-assigned to the local District Sub-Admin mapped to your postal PIN code with real-time status tracking.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-3xl sm:text-4xl font-black text-sky-400">100%</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Geotagged Proof</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400">&lt; 24h</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">SLA Triage</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-amber-400">PIN-Code</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Auto-Routing</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl font-black text-purple-400">Live</div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Resolution Audit</div>
        </div>
      </section>

      {/* Footer Navigation */}
      <footer className="border-t border-slate-200 pt-8 pb-12 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <div>&copy; 2026 CivicLens &bull; Smart Grievance Redressal System</div>
        <div className="flex items-center space-x-6">
          <Link to="/admin/login" className="hover:text-blue-600 font-semibold">
            District Sub-Admin Portal
          </Link>
          <Link to="/superadmin/login" className="hover:text-sky-700 font-semibold">
            State Governance Super Admin
          </Link>
        </div>
      </footer>
    </div>
  );
};

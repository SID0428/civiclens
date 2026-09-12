import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  Globe,
  Sparkles,
  Zap,
  Activity,
  Cpu,
  Layers,
  AlertTriangle,
  Flame,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { API } from '../services/api';
import { CivicGrievanceMap } from '../components/CivicGrievanceMap';

interface PublicStats {
  totalComplaints: number;
  totalCitizenReports: number;
  pending: number;
  ongoing: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  resolutionRate: number;
  categories: Record<string, number>;
}

export const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'both' | 'before' | 'after'>('both');
  const [stats, setStats] = useState<PublicStats>({
    totalComplaints: 0,
    totalCitizenReports: 0,
    pending: 0,
    ongoing: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    resolutionRate: 0,
    categories: {},
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    try {
      const res = await API.request('/complaints/stats', 'GET');
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch public stats:', err);
    } finally {
      setStatsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds for live pulse
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const CIVIC_CATEGORIES = [
    {
      title: 'Roads & Potholes',
      dept: 'Public Works Dept (PWD)',
      desc: 'Craters, asphalt cracks, cave-ins, and uneven surfaces.',
      icon: '🛣️',
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400',
      badge: 'High Priority SLA'
    },
    {
      title: 'Garbage & Sanitation',
      dept: 'Municipal Waste Board',
      desc: 'Illegal dump yards, overflowing bins, and bio-waste.',
      icon: '🗑️',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400',
      badge: '24h Rapid Clearance'
    },
    {
      title: 'Water Supply & Sewage',
      dept: 'Jal Board & Drainage Cell',
      desc: 'Burst pipelines, contaminated water, and open drain overflow.',
      icon: '🚰',
      color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-400',
      badge: 'Urgent Sanitation'
    },
    {
      title: 'Electricity & Streetlights',
      dept: 'Power Distribution Corp',
      desc: 'Snapped power cables, dark corridors, and broken sodium lamps.',
      icon: '💡',
      color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20 text-yellow-400',
      badge: 'Public Safety Hazard'
    },
    {
      title: 'Public Infrastructure',
      dept: 'Urban Development Authority',
      desc: 'Damaged sidewalks, broken safety railings, and bridge cracks.',
      icon: '🏛️',
      color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-400',
      badge: 'Structural Audit'
    },
    {
      title: 'Encroachment & Traffic',
      dept: 'Traffic & Enforcement Wing',
      desc: 'Footpath blockages, hazardous construction debris on roads.',
      icon: '🚧',
      color: 'from-rose-500/10 to-red-500/10 border-rose-500/20 text-rose-400',
      badge: 'Enforcement Action'
    }
  ];

  return (
    <div className="space-y-20 py-8 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden text-slate-800">
      {/* ─── 1. HERO SECTION WITH AMBIENT GLOW & CYBER-CIVIC HUD ─── */}
      <section className="relative pt-4 pb-8">
        {/* Background Ambient Glowing Orbs */}
        <div className="absolute top-10 left-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline, Subtitle, & CTA Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Live Telemetry Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-sky-700 text-xs font-bold border border-sky-200/80 shadow-sm hover:border-sky-300 transition cursor-default">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
              <span className="tracking-wide">Strict Hardware GPS &bull; Groq Vision AI Redressal</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Fix Broken Cities in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600">
                30 Seconds
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Potholes, broken streetlights, sewage leaks, or illegal garbage dumps? CivicLens uses verified real-time GPS & live camera photos to route grievances directly to your designated district officer.
            </p>

            {/* Mobile-Only Hero Showcase Image */}
            <div className="block lg:hidden my-6">
              <div className="relative mx-auto max-w-md">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 rounded-3xl blur-md opacity-20"></div>
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl">
                  <img
                    src="/images/s.jpeg"
                    alt="CivicLens in Action: Citizens identifying broken streetlights, potholes, and garbage on city streets with AI"
                    className="w-full h-auto object-cover max-h-[300px] sm:max-h-[360px]"
                    loading="eager"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AI Ground Vision Active</span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-3.5 text-white text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200">On-Site Real-Time Reporting</span>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/30 text-sky-300 font-mono text-[9px] font-bold border border-sky-400/30">
                        GPS LOCKED
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-tight">
                      Detects broken streetlights, potholes &amp; garbage dumps directly from live camera.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to="/report"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2.5 group"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition" />
                <span>File Grievance</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>

              <Link
                to="/explore"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-sky-600" />
                <span>Explore Public Feed</span>
              </Link>

              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>Track Status</span>
              </Link>
            </div>

            {/* High-Tech Trust Badges */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>AI Vision Categorization</span>
              </div>
              <div className="flex items-center gap-1.5 bg-sky-50 text-sky-700 px-3 py-1.5 rounded-xl border border-sky-200">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Strict Hardware GPS</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>100m Anti-Tamper Geofence</span>
              </div>
            </div>
          </div>

          {/* Desktop-Only Right Column: High-Tech Hero HUD Showcase */}
          <div className="hidden lg:block lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Background ambient glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-sky-400/20 via-blue-500/15 to-indigo-500/20 rounded-3xl blur-2xl opacity-60"></div>

              {/* Main Image Frame with Futuristic Overlays */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl group">
                <img
                  src="/images/s.jpeg"
                  alt="CivicLens in Action: Citizens identifying broken streetlights, potholes, and garbage on city streets with AI"
                  className="w-full h-auto object-cover max-h-[420px] transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />

                {/* Simulated Groq AI Scanline Effect on Hover */}
                <div className="ai-scanline-overlay opacity-60"></div>

                {/* Floating Telemetry Overlays */}
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-lg border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-mono text-emerald-300">AI GROUND VISION ACTIVE</span>
                </div>

                <div className="absolute top-3 right-3 bg-sky-900/85 backdrop-blur-md text-sky-200 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold border border-sky-400/30 shadow-lg">
                  PIN-ROUTING LIVE
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-5 text-white">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      <span>On-Site Real-Time Reporting</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-500/30 text-sky-300 font-mono text-[10px] font-black border border-sky-400/30">
                      GPS LOCKED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    CivicLens detects broken streetlights, potholes &amp; garbage dumps directly from smartphone camera feeds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE REAL-TIME CIVIC REDRESSAL TELEMETRY STRIP ─── */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
              <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span>Live Municipal Telemetry &bull; Real-Time Grievance Tracker</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Grievance Redressal Performance Pulse
            </h2>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>

        {/* 4 Core Dynamic Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Total Registered */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Total Grievances</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900">
              {statsLoading ? '...' : stats.totalComplaints}
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{stats.totalCitizenReports || stats.totalComplaints} Citizen Reports Linked</span>
            </div>
          </div>

          {/* 2. Pending Triage */}
          <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider">
              <span>Pending Triage</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-950">
              {statsLoading ? '...' : stats.pending}
            </div>
            <div className="text-[11px] text-amber-800 font-medium">
              Awaiting officer site dispatch
            </div>
          </div>

          {/* 3. Ongoing Redressals */}
          <div className="bg-gradient-to-br from-sky-50/80 to-blue-50/50 p-5 rounded-2xl border border-sky-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Ongoing Actions</span>
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-sky-950">
              {statsLoading ? '...' : (stats.ongoing || stats.inProgress)}
            </div>
            <div className="text-[11px] text-sky-800 font-medium">
              Active engineering repair underway
            </div>
          </div>

          {/* 4. Resolved & Verified */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <span>Resolved &amp; Closed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-950">
              {statsLoading ? '...' : stats.resolved}
            </div>
            <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
              <span>{stats.resolutionRate}% Verified Resolution Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE INTERACTIVE GEOTAGGED GRIEVANCE RADAR (MAP) ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Real-Time Geospatial Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Live Issue Heatmap &amp; Incident Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Explore geotagged complaints nationwide. Click any marker on the grid to inspect on-site photographic evidence, category diagnosis, citizen reports, and resolution tracking.
            </p>
          </div>

          <Link
            to="/explore"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Fullscreen Public Feed</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* The Live Interactive Map Component */}
        <CivicGrievanceMap />
      </section>

      {/* ─── 2. THREE-STEP WORKFLOW PIPELINE ─── */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
            <Zap className="w-3.5 h-3.5 text-sky-600" />
            <span>Automated Citizen Redressal Protocol</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How CivicLens Solves Civic Hazards
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            From physical GPS locking to on-site municipal field verification in 3 seamless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="relative group bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-lg border border-sky-100 shadow-inner group-hover:scale-110 transition">
                <MapPin className="w-6 h-6 text-sky-600" />
              </div>
              <span className="text-3xl font-black font-mono text-slate-300 group-hover:text-sky-600 transition">01</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">1. Real-Time GPS Pin</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Your physical smartphone GPS hardware sensor locks the exact geographic coordinates without manual spoofing or address confusion.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative group bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 shadow-inner group-hover:scale-110 transition">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-black font-mono text-slate-300 group-hover:text-blue-600 transition">02</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">2. Live Watermarked Camera</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Capture on-site photos with verified GPS coordinates and timestamp watermarks permanently burned onto the canvas bytes with Groq AI analysis.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative group bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100 shadow-inner group-hover:scale-110 transition">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-3xl font-black font-mono text-slate-300 group-hover:text-emerald-600 transition">03</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">3. Direct Municipal Routing</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Auto-assigned to the local District Sub-Admin mapped to your postal PIN code, enforced by 100m on-site physical geofencing for resolution.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. VERIFIED GROUND IMPACT: BEFORE & AFTER RESOLUTION SHOWCASE ─── */}
      <section className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text & Metrics */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proven Municipal Transformation</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              From Citizen Complaint to Smooth Asphalt
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every complaint filed with CivicLens is backed by verifiable on-site evidence. When waterlogged craters and severe potholes were reported on this transit corridor, the local municipal engineering division mobilized heavy paving crews to completely reconstruct the roadway.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Resolution SLA</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">48 Hours</div>
                <div className="text-[11px] text-slate-500">From Report to Completion</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">On-Site Verification</div>
                <div className="text-xl font-black text-sky-600 mt-0.5">100% Geotagged</div>
                <div className="text-[11px] text-slate-500">Live GPS Verified</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline group"
              >
                <span>View more resolved community grievances</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* Right Image Display with Interactive Badges */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 group">
              <img
                src="/images/before_after3.jpeg"
                alt="Before and After: Muddy cratered road paved into brand new smooth asphalt"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-102"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 bg-rose-600/95 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md">
                Before: Waterlogged Craters
              </div>
              <div className="absolute bottom-3 right-3 bg-emerald-600/95 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>After: Smooth Paved Asphalt</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. HIGH-TECH KPI COMMAND DECK (STATS SECTION) ─── */}
      <section className="relative bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl overflow-hidden border border-slate-800">
        {/* Ambient Neon Accent */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <div className="pt-4 sm:pt-0">
            <div className="text-3xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              {statsLoading ? '100%' : `${stats.resolutionRate}%`}
            </div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-2">
              Verified Resolution Rate
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {stats.resolved} of {stats.totalComplaints || 0} Tickets Closed
            </div>
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              {statsLoading ? '0' : stats.totalCitizenReports || stats.totalComplaints}
            </div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-2">
              Citizens Empowered
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">AI Duplicate Merged Evidence</div>
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              {statsLoading ? '0' : (stats.ongoing || stats.inProgress)}
            </div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-2">
              Active Field Actions
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sub-Admins On-Site</div>
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              Live
            </div>
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-2">
              Groq AI Vision Audit
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Anti-Spoof Geotag Security</div>
          </div>
        </div>
      </section>

      {/* ─── 5. CIVIC CATEGORIES MATRIX ─── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Comprehensive Municipal Scope</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Grievance Categories Handled
            </h2>
          </div>
          <Link
            to="/report"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>File an issue in any category</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CIVIC_CATEGORIES.map((cat, idx) => {
            const count = stats.categories ? stats.categories[cat.title] || 0 : 0;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {count > 0 ? `${count} Active Cases` : cat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{cat.title}</h3>
                  <div className="text-[11px] font-semibold text-sky-600">{cat.dept}</div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">{cat.desc}</p>
                </div>

                <Link
                  to={`/explore?category=${encodeURIComponent(cat.title)}`}
                  className="pt-2 text-xs font-bold text-slate-700 hover:text-sky-600 flex items-center justify-between border-t border-slate-100"
                >
                  <span>View reported cases ({count})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 6. OPEN COMMUNITY TRANSPARENCY CALLOUT ─── */}
      <section className="relative bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden border border-blue-800/50">
        {/* Background glow circle */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative space-y-3 max-w-xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold border border-white/20 backdrop-blur-md">
            <Globe className="w-3.5 h-3.5 text-sky-300" />
            <span>Open Public Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Explore Grievances Across All States
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
            No login required. Explore active & resolved issues reported by citizens nationwide, sorted automatically to show the civic complaints nearest to your current location first.
          </p>
        </div>

        <Link
          to="/explore"
          className="relative z-10 px-7 py-4 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2.5 shrink-0 group"
        >
          <span>View Nearest Grievances</span>
          <ArrowRight className="w-4 h-4 text-slate-900 group-hover:translate-x-1 transition" />
        </Link>
      </section>
    </div>
  );
};


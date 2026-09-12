import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Camera,
  LogOut,
  User as UserIcon,
  Globe,
  Shield,
  Menu,
  X,
  Home as HomeIcon,
  LayoutDashboard,
  Building2,
  ChevronRight,
  LogIn,
  MapPin,
} from 'lucide-react';
import { API } from '../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleViewMap = (e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      const mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate('/#map');
    }
  };

  const isSuperAdminPath = location.pathname.startsWith('/superadmin');
  const isAdminPath = location.pathname.startsWith('/admin');

  const activeRole = isSuperAdminPath ? 'superadmin' : isAdminPath ? 'subadmin' : 'citizen';
  const user = API.getUser(activeRole);
  const role = API.getRole(activeRole);

  // Close mobile menu whenever location/path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  let logoHref = '/';
  let portalSubtitle = 'AI Redressal Engine';
  let portalBadge = null;

  if (isSuperAdminPath) {
    logoHref = user && (role === 'superadmin' || activeRole === 'superadmin') ? '/superadmin/dashboard' : '/superadmin/login';
    portalSubtitle = 'State Master Console';
    portalBadge = (
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
        <Shield className="w-3 h-3 text-purple-600" />
        <span>State Master</span>
      </span>
    );
  } else if (isAdminPath) {
    logoHref = user && (role === 'subadmin' || role === 'superadmin' || activeRole === 'subadmin') ? '/admin/dashboard' : '/admin/login';
    portalSubtitle = 'District Officer Console';
    portalBadge = (
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
        <Shield className="w-3 h-3 text-blue-600" />
        <span>District Officer</span>
      </span>
    );
  }

  const handleLogout = () => {
    API.logout(activeRole);
    setIsMobileMenuOpen(false);
    if (activeRole === 'superadmin') {
      navigate('/superadmin/login');
    } else if (activeRole === 'subadmin') {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 transition-all duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-16 flex justify-between items-center gap-2 sm:gap-4">
        {/* Brand Logo - Context-aware routing */}
        <Link to={logoHref} className="flex items-center space-x-2.5 shrink-0 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center p-1 border border-slate-200 shadow-md shadow-sky-500/10 group-hover:shadow-lg group-hover:shadow-sky-500/20 group-hover:scale-105 transition-all duration-300 overflow-hidden">
              <img src="/images/logo.png" alt="CivicLens Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1">
                Civic<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-teal-600 to-cyan-600">Lens</span>
              </span>
              {portalBadge}
            </div>
            <span className="hidden sm:inline text-[9px] font-bold text-slate-500 -mt-0.5 tracking-wider uppercase font-mono">
              {portalSubtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {!isAdminPath && !isSuperAdminPath && (
            <>
              <Link
                to="/explore"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/explore') || isActive('/public-complaints')
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                <span>Public Feed</span>
              </Link>

              <button
                type="button"
                onClick={handleViewMap}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50/80 border border-transparent hover:border-sky-200"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>View Map</span>
              </button>

              <Link
                to="/report"
                className="relative group px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 active:scale-95 transition-all duration-300 flex items-center gap-1.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Camera className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 font-bold">Report Issue</span>
              </Link>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Link
                to={
                  activeRole === 'superadmin'
                    ? '/superadmin/dashboard'
                    : activeRole === 'subadmin'
                    ? '/admin/dashboard'
                    : '/dashboard'
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition flex items-center gap-2 border border-slate-200 shadow-2xs"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-sky-500 to-teal-500 text-white text-[10px] font-black flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="max-w-[110px] truncate">{user.name || 'Account'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              {!isAdminPath && !isSuperAdminPath && (
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 transition flex items-center gap-1.5 border border-slate-200"
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Citizen Sign In</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mobile Quick Action + Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {!isAdminPath && !isSuperAdminPath && (
            <Link
              to="/report"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Report</span>
            </Link>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition border border-slate-200/80 shadow-2xs"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-800" />
            ) : (
              <Menu className="w-5 h-5 text-slate-800" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-2xl px-4 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {/* User Profile Banner if logged in */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-sky-50 border border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize truncate">
                    {activeRole === 'superadmin' ? 'State Master Admin' : activeRole === 'subadmin' ? `District Officer (${user.assignedDistrict || 'N/A'})` : 'Citizen User'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1 border border-rose-200 shadow-2xs shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Primary Navigation Links */}
          <div className="space-y-1.5">
            {!isAdminPath && !isSuperAdminPath && (
              <>
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    isActive('/')
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HomeIcon className="w-4 h-4 text-sky-600" />
                    <span>Home</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  to="/explore"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    isActive('/explore') || isActive('/public-complaints')
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>Public Grievance Feed</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <button
                  type="button"
                  onClick={handleViewMap}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between text-slate-700 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <span>Live Issue Map</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <Link
                  to="/report"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full px-3.5 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 text-white text-xs font-black shadow-md shadow-sky-500/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4" />
                    <span>Report Civic Issue (AI Vision)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    isActive('/dashboard')
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-sky-600" />
                    <span>Track My Grievances</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </>
            )}

            {isAdminPath && (
              <Link
                to="/admin/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  isActive('/admin/dashboard')
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-black'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>District Officer Dashboard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}

            {isSuperAdminPath && (
              <Link
                to="/superadmin/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  isActive('/superadmin/dashboard')
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-black'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>State Governance Console</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}
          </div>

          {/* Citizen Auth Links (if not logged in) */}
          {!user && !isAdminPath && !isSuperAdminPath && (
            <div className="pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold text-center border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold text-center shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Register</span>
              </Link>
            </div>
          )}

          {/* Quick Portal Switchers */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <Link
              to="/admin/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-sky-700 flex items-center gap-1 transition"
            >
              <Shield className="w-3 h-3 text-blue-600" />
              <span>Officer Portal</span>
            </Link>
            <span>&bull;</span>
            <Link
              to="/superadmin/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-sky-700 flex items-center gap-1 transition"
            >
              <Building2 className="w-3 h-3 text-purple-600" />
              <span>State Admin Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};



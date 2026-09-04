import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, LogOut, User as UserIcon } from 'lucide-react';
import { API } from '../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdminPath = location.pathname.startsWith('/superadmin');
  const isAdminPath = location.pathname.startsWith('/admin');

  const activeRole = isSuperAdminPath ? 'superadmin' : isAdminPath ? 'subadmin' : 'citizen';
  const user = API.getUser(activeRole);
  const role = API.getRole(activeRole);

  const handleLogout = () => {
    API.logout(activeRole);
    if (activeRole === 'superadmin') {
      navigate('/superadmin/login');
    } else if (activeRole === 'subadmin') {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex justify-between items-center gap-2 sm:gap-4">
        <Link to="/" className="flex items-center space-x-2 shrink-0 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-sky-500/20 group-hover:scale-105 transition">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Civic<span className="text-sky-600">Lens</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isAdminPath && !isSuperAdminPath && (
            <Link
              to="/report"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] sm:text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to={activeRole === 'superadmin' ? '/superadmin/dashboard' : activeRole === 'subadmin' ? '/admin/dashboard' : '/dashboard'}
                className="text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-sky-600 transition whitespace-nowrap"
              >
                {activeRole === 'citizen' ? 'My Complaints' : 'Dashboard'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {!isAdminPath && !isSuperAdminPath && (
                <Link
                  to="/login"
                  className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-sky-600 transition flex items-center gap-1 whitespace-nowrap"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Citizen Sign In</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, LogOut, User as UserIcon } from 'lucide-react';
import { API } from '../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser();
  const role = API.getRole();

  const handleLogout = () => {
    API.logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-sky-500/20 group-hover:scale-105 transition">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">
            Civic<span className="text-sky-600">Lens</span>
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            to="/report"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                to={role === 'superadmin' ? '/superadmin/dashboard' : role === 'subadmin' ? '/admin/dashboard' : '/dashboard'}
                className="text-xs font-semibold text-slate-600 hover:text-sky-600 transition"
              >
                {role === 'citizen' ? 'My Complaints' : 'Dashboard'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-600 transition flex items-center gap-1"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Citizen Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

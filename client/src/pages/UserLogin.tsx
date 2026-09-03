import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { API } from '../services/api';

export const UserLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await API.request('/auth/login', 'POST', { email, password });
      API.setAuth(res.token, res.user, res.user.role);
      navigate(res.user.role === 'citizen' ? '/dashboard' : res.user.role === 'subadmin' ? '/admin/dashboard' : '/superadmin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await API.request('/auth/google', 'POST', {
        email: 'citizen.demo@gmail.com',
        name: 'Aarav Sharma (Google)',
        googleId: 'google_oauth_demo_12345',
      });
      API.setAuth(res.token, res.user, 'citizen');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto text-xl">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Citizen Sign In</h2>
          <p className="text-xs text-slate-500">Log in to track your grievances & redressal updates</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Signing In...' : 'Sign In with Password'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={handleDemoGoogleLogin}
          className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>Continue with Google</span>
        </button>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don't have an account?{' '}
          <Link to="/signup" className="text-sky-600 font-bold hover:underline">
            Sign up with OTP
          </Link>
        </div>
      </div>
    </div>
  );
};

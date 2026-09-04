import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Clock, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import { API } from '../services/api';
import { Complaint } from '../types';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('citizen');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || API.getRole('citizen') !== 'citizen') {
      navigate('/login');
      return;
    }
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await API.request('/complaints/my');
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress' || c.status === 'Under Review').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* User Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl font-black">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Welcome, {user?.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <Link
          to="/report"
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>File Geotagged Grievance</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Reported</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase">Pending Review</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-600 uppercase">In Progress</div>
          <div className="text-3xl font-black text-blue-600 mt-1">{inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase">Resolved</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{resolved}</div>
        </div>
      </div>

      {/* Grievance Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">My Reported Issues</h2>
          <button
            onClick={loadComplaints}
            className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading your complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-sky-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Complaints Lodged Yet</h3>
            <p className="text-xs text-slate-500 mt-1">Spotted an issue? Report it with live geotagged proof in seconds.</p>
            <Link
              to="/report"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow hover:bg-sky-700 transition"
            >
              Report Issue Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complaints.map((item) => {
              const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;
              const photosCount = item.images?.length || 1;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img src={mainImg} alt={item.title} className="w-full h-full object-cover" />
                      <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md ${
                        item.status === 'Resolved' ? 'bg-emerald-500 text-white' :
                        item.status === 'In Progress' ? 'bg-blue-600 text-white' :
                        item.status === 'Under Review' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {item.status}
                      </span>
                      <div className="absolute bottom-2 left-2 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                          PIN {item.pincode}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-sky-900/80 backdrop-blur-md text-sky-200 text-[10px] font-mono">
                          GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </span>
                        {photosCount > 1 && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-white text-[10px] font-bold">
                            +{photosCount - 1} Photos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <span className="text-xs font-bold text-sky-700">{item.category}</span>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2">{item.description}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 mt-3 pt-3 space-y-2">
                    <div className="text-[11px] text-slate-500 flex justify-between items-center">
                      <span>Assigned Officer:</span>
                      <span className="font-bold text-slate-700">
                        {item.assignedSubAdmin ? item.assignedSubAdmin.name : 'District Routing Pending'}
                      </span>
                    </div>

                    {item.resolvedImageUrl && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Official Resolution Proof:</div>
                        <img src={item.resolvedImageUrl} alt="Resolved" className="rounded-lg h-24 w-full object-cover shadow-sm" />
                        {item.resolutionNotes && (
                          <p className="text-[11px] text-emerald-900 mt-1.5 italic font-medium">
                            "{item.resolutionNotes}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 text-right">
                      Reported on {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

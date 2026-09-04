import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Shield, RefreshCw, PenSquare, MapPin } from 'lucide-react';
import { API } from '../services/api';
import { Complaint } from '../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser('subadmin') || API.getUser('superadmin');
  const role = API.getRole('subadmin') || API.getRole('superadmin');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Status update modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || (role !== 'subadmin' && role !== 'superadmin')) {
      navigate('/admin/login');
      return;
    }
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await API.request('/complaints/subadmin');
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);

    const formData = new FormData();
    formData.append('status', newStatus);
    formData.append('resolutionNotes', resolutionNotes);
    if (proofFile) formData.append('resolvedImage', proofFile);

    try {
      await API.request(`/complaints/${selectedComplaint._id}/status`, 'PUT', formData, true);
      alert('Grievance status updated successfully!');
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  const isAllDepartments = !user?.department || user.department === 'All Departments' || user.department === 'All';

  const DEPARTMENTS = [
    'All',
    'Roads & Potholes',
    'Garbage & Sanitation',
    'Water Supply & Sewage',
    'Electricity & Streetlights',
    'Public Infrastructure',
    'Encroachment & Traffic',
    'Other',
  ];

  const filteredComplaints = complaints.filter((c) => {
    if (selectedDepartment === 'All') return true;
    if (selectedDepartment === 'Other') {
      return !['Roads & Potholes', 'Garbage & Sanitation', 'Water Supply & Sewage', 'Electricity & Streetlights', 'Public Infrastructure', 'Encroachment & Traffic'].includes(c.category);
    }
    return c.category === selectedDepartment;
  });

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending' || c.status === 'Under Review').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Officer Scope Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Assigned District Officer Console</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">{user?.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Department: <strong className="text-slate-800">{user?.department || 'General Administration'}</strong> &bull; District: <strong className="text-slate-800">{user?.assignedDistrict || 'Designated'}</strong>
          </p>
        </div>

        {/* Assigned Pincodes */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Your Covered Pincodes:</span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {user?.assignedPincodes && user.assignedPincodes.length > 0 ? (
              user.assignedPincodes.map((p) => (
                <span key={p} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700">
                  PIN {p}
                </span>
              ))
            ) : (
              <span className="text-xs text-amber-600 font-semibold">Broad Jurisdiction</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Assigned In Pincode</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase">Action Required</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-600 uppercase">In Progress</div>
          <div className="text-3xl font-black text-blue-600 mt-1">{inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase">Resolved & Closed</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{resolved}</div>
        </div>
      </div>

      {/* Section-Wise Department Summary Cards (Visible when managing All Departments or as Quick Overview) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Section-Wise Department Breakdown</span>
          </h2>
          <span className="text-xs text-slate-500">Click any department to filter feed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {DEPARTMENTS.map((dept) => {
            const count = dept === 'All'
              ? complaints.length
              : complaints.filter((c) => {
                  if (dept === 'Other') {
                    return !['Roads & Potholes', 'Garbage & Sanitation', 'Water Supply & Sewage', 'Electricity & Streetlights', 'Public Infrastructure', 'Encroachment & Traffic'].includes(c.category);
                  }
                  return c.category === dept;
                }).length;

            const isSelected = selectedDepartment === dept;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {dept}
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className={`text-xl font-black font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {count}
                  </span>
                  <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    issues
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grievance Feed Header & Department Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              District Grievance Triage Feed
              {selectedDepartment !== 'All' && (
                <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {selectedDepartment} ({filteredComplaints.length})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredComplaints.length} of {complaints.length} assigned grievances
            </p>
          </div>
          <button onClick={loadComplaints} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh List</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Querying district grievances...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Complaints Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedDepartment === 'All'
                ? 'No pending civic complaints in your assigned district pincodes.'
                : `No complaints found for "${selectedDepartment}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplaints.map((item) => {
              const mainImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;

              return (
                <div key={item._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="relative aspect-video bg-slate-100">
                      <img src={mainImg} alt={item.title} className="w-full h-full object-cover" />
                      <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow ${
                        item.status === 'Resolved' ? 'bg-emerald-500 text-white' :
                        item.status === 'In Progress' ? 'bg-blue-600 text-white' :
                        item.status === 'Under Review' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {item.status}
                      </span>
                      <div className="absolute bottom-2 left-2 flex gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                          PIN {item.pincode}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-900/80 backdrop-blur-md text-blue-200 text-[10px] font-mono font-bold">
                          GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-600">{item.category}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2">{item.description}</p>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{item.address}</span>
                      </div>
                      {item.citizen && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          Reported by: <strong className="text-slate-900">{item.citizen.name}</strong> ({item.citizen.phone || item.citizen.email})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={() => {
                        setSelectedComplaint(item);
                        setNewStatus(item.status);
                        setResolutionNotes(item.resolutionNotes || '');
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                      <span>Update Status & Resolution Proof</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Update Grievance Status</h3>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress (Field Team Dispatched)</option>
                  <option value="Resolved">Resolved (Work Completed)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe action taken, contractor assigned, or completion details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Upload "After" Resolution Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {updating ? 'Saving...' : 'Save & Publish Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, Users, Building, Activity, RefreshCw, Edit3, Trash2 } from 'lucide-react';
import { API } from '../services/api';
import { User } from '../types';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = API.getUser();
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New subadmin modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [assignedDistrict, setAssignedDistrict] = useState('');
  const [assignedPincodes, setAssignedPincodes] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit subadmin modal
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('All Departments');
  const [editDistrict, setEditDistrict] = useState('');
  const [editPincodes, setEditPincodes] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || API.getRole() !== 'superadmin') {
      navigate('/superadmin/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminRes, statRes] = await Promise.all([
        API.request('/admin/subadmins'),
        API.request('/admin/stats'),
      ]);
      setSubAdmins(adminRes.subAdmins || []);
      setStats(statRes.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await API.request('/admin/subadmins', 'POST', {
        name,
        email,
        password,
        phone,
        department,
        assignedDistrict,
        assignedPincodes,
      });
      alert('District Sub-Admin registered successfully!');
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setAssignedPincodes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create sub-admin');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (admin: User) => {
    setEditingAdmin(admin);
    setEditName(admin.name || '');
    setEditPhone(admin.phone || '');
    setEditDepartment(admin.department || 'All Departments');
    setEditDistrict(admin.assignedDistrict || '');
    setEditPincodes(admin.assignedPincodes ? admin.assignedPincodes.join(', ') : '');
    setEditPassword('');
  };

  const handleUpdateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setUpdating(true);

    try {
      const adminId = editingAdmin._id || editingAdmin.id;
      await API.request(`/admin/subadmins/${adminId}`, 'PUT', {
        name: editName,
        phone: editPhone,
        department: editDepartment,
        assignedDistrict: editDistrict,
        assignedPincodes: editPincodes,
        ...(editPassword ? { password: editPassword } : {}),
      });
      alert('Sub-Admin details updated successfully!');
      setEditingAdmin(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update sub-admin');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubAdmin = async (admin: User) => {
    const adminId = admin._id || admin.id;
    if (!window.confirm(`Are you sure you want to delete sub-admin ${admin.name}?`)) return;

    try {
      await API.request(`/admin/subadmins/${adminId}`, 'DELETE');
      alert(`Officer ${admin.name} deleted.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sub-admin');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>State Governance Master Console</span>
          </div>
          <h1 className="text-2xl font-black">{user?.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Central state administrative oversight & officer creation</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register District Sub-Admin</span>
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Statewide Grievances</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{stats.totalComplaints}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-600 uppercase">Resolved Rate</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{stats.resolutionRate}%</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-blue-600 uppercase">Active Citizens</div>
            <div className="text-3xl font-black text-blue-600 mt-1">{stats.totalCitizens}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-purple-600 uppercase">District Sub-Admins</div>
            <div className="text-3xl font-black text-purple-600 mt-1">{stats.totalSubAdmins}</div>
          </div>
        </div>
      )}

      {/* Sub-Admins Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Registered District Officers & Mapped PIN Codes</h2>
          <button onClick={loadData} className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading officers...</div>
        ) : subAdmins.length === 0 ? (
          <div className="py-8 text-center text-slate-400">No district officers registered yet. Click "Register District Sub-Admin" above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Mapped Pincodes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subAdmins.map((admin) => (
                  <tr key={admin._id || admin.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{admin.name}</td>
                    <td className="py-3 px-4 text-slate-600">{admin.email}</td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">{admin.department || 'General'}</td>
                    <td className="py-3 px-4 text-slate-700">{admin.assignedDistrict || 'All'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {admin.assignedPincodes?.map((pin) => (
                          <span key={pin} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono rounded font-bold">
                            {pin}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-sky-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubAdmin(admin)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-rose-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Register District Sub-Admin</h3>

            <form onSubmit={handleCreateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh@civiclens.gov.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Set Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                    <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                    <option value="Water Supply & Sewage">Water Supply & Sewage</option>
                    <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                    <option value="Public Infrastructure">Public Infrastructure</option>
                    <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">District Name</label>
                  <input
                    type="text"
                    value={assignedDistrict}
                    onChange={(e) => setAssignedDistrict(e.target.value)}
                    placeholder="e.g. South Delhi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Postal Pincodes (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={assignedPincodes}
                  onChange={(e) => setAssignedPincodes(e.target.value)}
                  placeholder="110001, 110002, 110003"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  All grievances submitted within these PIN codes will auto-route to this officer's dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {creating ? 'Registering...' : 'Register & Assign Jurisdiction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Edit Sub-Admin Officer Details</h3>

            <form onSubmit={handleUpdateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email</label>
                  <input
                    type="email"
                    disabled
                    value={editingAdmin.email}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Roads & Potholes">Roads & Potholes (PWD)</option>
                    <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                    <option value="Water Supply & Sewage">Water Supply & Sewage</option>
                    <option value="Electricity & Streetlights">Electricity & Streetlights</option>
                    <option value="Public Infrastructure">Public Infrastructure</option>
                    <option value="Encroachment & Traffic">Encroachment & Traffic</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">District Name</label>
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Postal Pincodes (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={editPincodes}
                  onChange={(e) => setEditPincodes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

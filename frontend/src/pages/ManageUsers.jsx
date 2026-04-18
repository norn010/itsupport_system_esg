import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ManageUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'IT'
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post('/api/users', formData);
      setIsModalOpen(false);
      setFormData({ username: '', password: '', full_name: '', email: '', role: 'IT' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser.id) return alert('You cannot delete yourself!');
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`/api/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Determine if a user can be deleted: not self, not MANAGER, not ADMIN
  const canDelete = (u) => {
    if (u.id === currentUser.id) return false;
    if (u.role === 'MANAGER' || u.role === 'ADMIN') return false;
    return true;
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading users...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Manage IT Staff</h1>
          <p className="text-slate-500 mt-1">Add or remove IT support accounts</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="card hover:shadow-xl transition-all duration-300 border-slate-100 group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-primary-200">
                {u.full_name?.charAt(0) || u.username?.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{u.full_name}</h3>
                <p className="text-xs text-slate-500 font-medium">@{u.username}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                  u.role === 'MANAGER' ? 'bg-yellow-100 text-yellow-700' :
                  u.role === 'IT' ? 'bg-indigo-100 text-indigo-700' :
                  u.role === "IT's" ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {u.role}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className="truncate">{u.email || 'No email set'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end">
              {u.id === currentUser.id && (
                <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">You (Active)</span>
              )}
              {canDelete(u) && (
                <button 
                  onClick={() => handleDelete(u.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Remove Staff
                </button>
              )}
              {!canDelete(u) && u.id !== currentUser.id && (
                <span className="text-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Protected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className="text-2xl font-black text-slate-900 mb-2">Add IT Staff</h2>
            <p className="text-slate-500 text-sm mb-6">Create a new login for your team member.</p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="input" placeholder="สมชาย ใจดี" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                  <input required type="text" name="username" value={formData.username} onChange={handleChange} className="input" placeholder="somchai_it" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange} className="input" placeholder="••••••••" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="somchai@example.com" />
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input appearance-none cursor-pointer"
                >
                  <option value="IT">IT — ทีม IT ทั่วไป</option>
                  <option value="IT's">IT's — ผู้ใช้งานระดับสาขา</option>
                </select>
              </div>

              <div className="pt-4">
                <button type="submit" className="btn-primary w-full py-4 text-base shadow-xl shadow-primary-200">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;

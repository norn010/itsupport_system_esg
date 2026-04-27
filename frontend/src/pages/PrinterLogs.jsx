import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const fmtDateTime = (val) => {
  if (!val) return '—';
  // Handle Firestore timestamp
  if (typeof val === 'object' && val._seconds) {
    return new Date(val._seconds * 1000).toLocaleString('th-TH');
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('th-TH');
};

const toDateTimeLocal = (val) => {
  if (!val) return '';
  let d;
  if (typeof val === 'object' && val._seconds) {
    d = new Date(val._seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PrinterLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    product_name: '',
    serial_number: '',
    total_impressions: '',
    created_at: ''
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/printer-logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenCreate = () => {
    setFormData({ id: null, product_name: '', serial_number: '', total_impressions: '', created_at: '' });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (log) => {
    setFormData({
      id: log.id,
      product_name: log.product_name || '',
      serial_number: log.serial_number || '',
      total_impressions: log.total_impressions || '',
      created_at: toDateTimeLocal(log.created_at || log.updated_at)
    });
    setShowEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        product_name: formData.product_name,
        serial_number: formData.serial_number,
        total_impressions: formData.total_impressions
      };
      if (formData.created_at) {
        payload.created_at = formData.created_at;
      }
      if (formData.id) {
        await axios.put(`/api/printer-logs/${formData.id}`, payload);
      } else {
        await axios.post('/api/printer-logs', payload);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving printer log');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this printer log?')) return;
    try {
      await axios.delete(`/api/printer-logs/${id}`);
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting printer log');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Printer Logs
          </h1>
          <p className="text-slate-500 mt-1">{logs.length} logs recorded</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleOpenCreate} className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Log
          </button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden shadow-sm border border-slate-100">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            No logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-4 px-6 font-semibold">Product Name</th>
                  <th className="text-left py-4 px-6 font-semibold">Serial Number</th>
                  <th className="text-left py-4 px-6 font-semibold">Total Impressions</th>
                  <th className="text-left py-4 px-6 font-semibold">Updated At</th>
                  <th className="text-right py-4 px-6 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-800">{log.product_name || '—'}</td>
                    <td className="py-4 px-6 text-slate-600">{log.serial_number || '—'}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-primary-600">{log.total_impressions || '—'}</td>
                    <td className="py-4 px-6 text-slate-500 text-xs">{fmtDateTime(log.updated_at)}</td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => handleOpenEdit(log)} className="text-primary-600 hover:text-primary-800 font-medium mr-4">Edit</button>
                      <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {formData.id ? 'Edit Printer Log' : 'Add New Printer Log'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} placeholder="e.g. LaserJet Pro MFP M428fdw" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Serial Number</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="Enter SN" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Impressions</label>
                  <input type="number" className="input focus:ring-primary-500/20" value={formData.total_impressions} onChange={e => setFormData({ ...formData, total_impressions: e.target.value })} placeholder="e.g. 15000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date & Time <span className="text-xs text-slate-400 font-normal">(Leave blank for current time)</span></label>
                  <input type="datetime-local" className="input focus:ring-primary-500/20" value={formData.created_at} onChange={e => setFormData({ ...formData, created_at: e.target.value })} />
                </div>
              </div>
              
              <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary !px-5 !py-2.5 shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5 shadow-sm">
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Log'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterLogs;

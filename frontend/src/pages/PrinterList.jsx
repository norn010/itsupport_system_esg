import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const PrinterList = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    brand: '',
    branch: '',
    product_name: '',
    serial_number: '',
    ip: ''
  });

  const fetchPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/printers');
      setPrinters(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  const handleOpenCreate = () => {
    setFormData({ id: null, brand: '', branch: '', product_name: '', serial_number: '', ip: '' });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (printer) => {
    setFormData({
      id: printer.id,
      brand: printer.brand || '',
      branch: printer.branch || '',
      product_name: printer.product_name || '',
      serial_number: printer.serial_number || '',
      ip: printer.ip || ''
    });
    setShowEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        brand: formData.brand,
        branch: formData.branch,
        product_name: formData.product_name,
        serial_number: formData.serial_number,
        ip: formData.ip
      };
      if (formData.id) {
        await axios.put(`/api/printers/${formData.id}`, payload);
      } else {
        await axios.post('/api/printers', payload);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      fetchPrinters();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving printer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this printer?')) return;
    try {
      await axios.delete(`/api/printers/${id}`);
      fetchPrinters();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting printer');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Printer List
          </h1>
          <p className="text-slate-500 mt-1">{printers.length} printers registered</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleOpenCreate} className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Printer
          </button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden shadow-sm border border-slate-100">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : printers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            No printers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-4 px-6 font-semibold">Brand</th>
                  <th className="text-left py-4 px-6 font-semibold">Branch</th>
                  <th className="text-left py-4 px-6 font-semibold">Product Name</th>
                  <th className="text-left py-4 px-6 font-semibold">Serial Number</th>
                  <th className="text-left py-4 px-6 font-semibold">IP Address</th>
                  <th className="text-right py-4 px-6 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {printers.map(printer => (
                  <tr key={printer.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-800">{printer.brand || '—'}</td>
                    <td className="py-4 px-6 text-slate-600">{printer.branch || '—'}</td>
                    <td className="py-4 px-6 text-slate-600">{printer.product_name || '—'}</td>
                    <td className="py-4 px-6 text-slate-600">{printer.serial_number || '—'}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono">{printer.ip || '—'}</td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => handleOpenEdit(printer)} className="text-primary-600 hover:text-primary-800 font-medium mr-4">Edit</button>
                      <button onClick={() => handleDelete(printer.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
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
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                {formData.id ? 'Edit Printer' : 'Add New Printer'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. HP, Canon, Epson" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g. HQ, Branch A" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} placeholder="e.g. LaserJet Pro MFP M428fdw" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Serial Number</label>
                  <input type="text" className="input focus:ring-primary-500/20" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="Enter SN" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">IP Address</label>
                  <input type="text" className="input focus:ring-primary-500/20 font-mono" value={formData.ip} onChange={e => setFormData({ ...formData, ip: e.target.value })} placeholder="e.g. 192.168.1.50" />
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
                    'Save Printer'
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

export default PrinterList;

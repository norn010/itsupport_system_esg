import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const STATUS_COLORS = {
  'Available': 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'In Use': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Repair': 'bg-amber-500/10 text-amber-700 border-amber-200',
  'Lost': 'bg-red-500/10 text-red-700 border-red-200',
  'Retired': 'bg-slate-500/10 text-slate-700 border-slate-200',
}

const TABS = ['Info', 'Assignments', 'Maintenance', 'Tickets', 'Audit Log']

const AssetDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Info')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [assignData, setAssignData] = useState({ user_name: '', user_id: '', note: '' })
  const [maintData, setMaintData] = useState({ issue_description: '', vendor_id: '', cost: '', start_date: '', status: 'pending' })
  const [vendors, setVendors] = useState([])
  const [saving, setSaving] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [locations, setLocations] = useState([])

  // Edit Combobox states
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const [subSearch, setSubSearch] = useState('')
  const [venOpen, setVenOpen] = useState(false)
  const [venSearch, setVenSearch] = useState('')
  const [locOpen, setLocOpen] = useState(false)
  const [locSearch, setLocSearch] = useState('')

  const [maintVenOpen, setMaintVenOpen] = useState(false)
  const [maintVenSearch, setMaintVenSearch] = useState('')

  const formatDate = (val) => {
    if (!val) return '—'
    // Handle Firebase Timestamp object { _seconds, _nanoseconds }
    if (val && typeof val === 'object' && val._seconds) {
      return new Date(val._seconds * 1000).toLocaleString()
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }

  const fetchAsset = async () => {
    try {
      const res = await axios.get(`/api/assets/${id}`)
      setAsset(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAsset() }, [id])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, locRes, venRes] = await Promise.all([
          axios.get('/api/assets/categories'),
          axios.get('/api/assets/locations'),
          axios.get('/api/assets/vendors')
        ])
        setCategories(catRes.data)
        setLocations(locRes.data)
        setVendors(venRes.data)
      } catch (err) { console.error(err) }
    }
    loadLookups()
  }, [])

  useEffect(() => {
    if (editData.category_id) {
      axios.get(`/api/assets/categories/${editData.category_id}/subcategories`)
        .then(res => setSubcategories(res.data))
        .catch(() => setSubcategories([]))
    }
  }, [editData.category_id])

  const handleAssign = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`/api/assets/${id}/assign`, assignData)
      setShowAssignModal(false)
      setAssignData({ user_name: '', user_id: '', note: '' })
      fetchAsset()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const handleReturn = async () => {
    if (!confirm('Return this asset?')) return
    try {
      await axios.post(`/api/assets/${id}/return`)
      fetchAsset()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  const handleCreateMaintenance = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...maintData };
      if (!data.vendor_id && maintVenSearch) data.vendor_name = maintVenSearch;

      await axios.post(`/api/assets/${id}/maintenance`, data)
      setShowMaintenanceModal(false)
      setMaintData({ issue_description: '', vendor_id: '', cost: '', start_date: '', status: 'pending' })
      setMaintVenSearch('')
      fetchAsset()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const handleUpdateMaintenance = async (maintId, newStatus) => {
    try {
      await axios.patch(`/api/assets/maintenance/${maintId}`, { status: newStatus })
      fetchAsset()
    } catch (err) { alert('Error updating maintenance') }
  }

  const handleEdit = () => {
    setEditData({
      name: asset.name, category_id: asset.category_id || '',
      subcategory_id: asset.subcategory_id || '', brand: asset.brand || '',
      model: asset.model || '', serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      warranty_expiry: asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : '',
      cost: asset.cost || '', vendor_id: asset.vendor_id || '',
      status: asset.status, location_id: asset.location_id || '',
      description: asset.description || '', image: null
    })
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      let data = { ...editData };
      let headers = {};

      // Add auto-create names
      if (!editData.vendor_id && venSearch) data.vendor_name = venSearch;
      if (!editData.location_id && locSearch) data.location_name = locSearch;

      if (editData.image) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (data[key] !== null && data[key] !== '') {
            formData.append(key, data[key]);
          }
        });
        data = formData;
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      await axios.put(`/api/assets/${id}`, data, { headers })
      setEditMode(false)
      setCatSearch(''); setSubSearch(''); setVenSearch(''); setLocSearch('');
      fetchAsset()
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to DELETE this asset? This action cannot be undone.')) return
    try {
      await axios.delete(`/api/assets/${id}`)
      window.location.href = '/assets'
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  // Generate a simple QR code using a public API
  const qrCodeUrl = asset ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/assets/${asset.id}`)}` : ''

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  if (!asset) return (
    <div className="text-center py-16">
      <h2 className="text-2xl font-bold text-slate-400">Asset not found</h2>
      <Link to="/assets" className="btn-primary mt-4 inline-block">Back to Assets</Link>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <Link to="/assets" className="text-sm text-primary-600 hover:text-primary-800 mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Back to Assets
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="font-mono text-primary-600">{asset.asset_code}</span>
            <span className={`badge text-xs ${STATUS_COLORS[asset.status]}`}>{asset.status}</span>
          </h1>
          <p className="text-lg text-slate-600 mt-1">{asset.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!asset.assignments?.some(a => !a.returned_at) && asset.status === 'Available' && (
            <button onClick={() => setShowAssignModal(true)} className="btn-primary text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Assign
            </button>
          )}
          {asset.assignments?.some(a => !a.returned_at) && (
            <button onClick={handleReturn} className="btn-secondary text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
              Return
            </button>
          )}
          {asset.status === 'Repair' && (
            <button 
              onClick={() => {
                const active = asset.maintenance?.find(m => m.status !== 'completed');
                if (active) handleUpdateMaintenance(active.id, 'completed');
              }} 
              className="btn-primary text-sm !bg-emerald-600 hover:!bg-emerald-700 border-emerald-600"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              ซ่อมเสร็จแล้ว
            </button>
          )}
          <button onClick={() => setShowMaintenanceModal(true)} className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            ส่งซ่อม
          </button>
          {!editMode && (
            <button onClick={handleEdit} className="btn-secondary text-sm">Edit</button>
          )}
          {user?.role === 'MANAGER' && (
            <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
          )}
        </div>
      </div>

      {/* Header Info (QR & Image) */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="card !p-4 flex-1 flex items-center gap-6">
          <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-lg border border-slate-200" />
          <div>
            <p className="text-sm font-semibold text-slate-700">QR Code</p>
            <p className="text-xs text-slate-500 mb-2">Scan to open asset detail page</p>
            <a href={qrCodeUrl} download={`${asset.asset_code}-qr.png`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Download QR Image ↓
            </a>
          </div>
        </div>
        
        {asset.image_url && (
          <div className="card !p-2 flex-1 flex items-center justify-center bg-slate-50 overflow-hidden">
            <img 
              src={asset.image_url} 
              alt={asset.name} 
              className="max-h-32 rounded-lg shadow-sm border border-white cursor-pointer hover:scale-105 transition-transform" 
              onClick={() => setShowFullImage(true)}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Info' && (
        <div className="card">
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input className="input" value={editData.name} onChange={e => setEditData(p => ({...p, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="input" value={editData.status} onChange={e => setEditData(p => ({...p, status: e.target.value}))}>
                    {['Available','In Use','Repair','Lost','Retired'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Edit Category Combobox */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <div className="input-group">
                    <input 
                      className="input pr-10" 
                      placeholder="Search category..."
                      value={catSearch || (categories.find(c => c.id == editData.category_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setCatSearch(val); 
                        setCatOpen(true);
                        const match = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                        if (match) setEditData(p => ({...p, category_id: match.id, subcategory_id: ''}));
                        else if (!val) setEditData(p => ({...p, category_id: '', subcategory_id: ''}));
                      }}
                      onFocus={() => { setCatOpen(true) }}
                      autoComplete="off"
                    />
                    <svg className={`dropdown-icon transition-transform ${catOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {catOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setCatOpen(false)}></div>
                      <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                        {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditData(p => ({...p, category_id: c.id, subcategory_id: ''}));
                              setCatSearch(c.name);
                              setCatOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Edit Subcategory Combobox */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                  <div className="input-group">
                    <input 
                      className="input pr-10 disabled:opacity-50" 
                      placeholder="Search subcategory..."
                      disabled={!editData.category_id}
                      value={subSearch || (subcategories.find(s => s.id == editData.subcategory_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setSubSearch(val); 
                        setSubOpen(true);
                        const match = subcategories.find(s => s.name.toLowerCase() === val.toLowerCase());
                        if (match) setEditData(p => ({...p, subcategory_id: match.id}));
                        else if (!val) setEditData(p => ({...p, subcategory_id: ''}));
                      }}
                      onFocus={() => { setSubOpen(true) }}
                      autoComplete="off"
                    />
                    <svg className={`dropdown-icon transition-transform ${subOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {subOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setSubOpen(false)}></div>
                      <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                        {subcategories.filter(s => s.name.toLowerCase().includes(subSearch.toLowerCase())).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setEditData(p => ({...p, subcategory_id: s.id}));
                              setSubSearch(s.name);
                              setSubOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input className="input" value={editData.brand} onChange={e => setEditData(p => ({...p, brand: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input className="input" value={editData.model} onChange={e => setEditData(p => ({...p, model: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                  <input className="input" value={editData.serial_number} onChange={e => setEditData(p => ({...p, serial_number: e.target.value}))} />
                </div>
                {/* Edit Location Combobox */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <div className="input-group">
                    <input 
                      className="input pr-10" 
                      placeholder="Search location..."
                      value={locSearch || (locations.find(l => l.id == editData.location_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setLocSearch(val); 
                        setLocOpen(true);
                        const match = locations.find(l => l.name.toLowerCase() === val.toLowerCase());
                        if (match) setEditData(p => ({...p, location_id: match.id}));
                        else if (!val) setEditData(p => ({...p, location_id: ''}));
                      }}
                      onFocus={() => { setLocOpen(true) }}
                      autoComplete="off"
                    />
                    <svg className={`dropdown-icon transition-transform ${locOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {locOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setLocOpen(false)}></div>
                      <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                        {locations.filter(l => l.name.toLowerCase().includes(locSearch.toLowerCase())).map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              setEditData(p => ({...p, location_id: l.id}));
                              setLocSearch(l.name);
                              setLocOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                          >
                            {l.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Edit Vendor Combobox */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <div className="input-group">
                    <input 
                      className="input pr-10" 
                      placeholder="Search vendor..."
                      value={venSearch || (vendors.find(v => v.id == editData.vendor_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setVenSearch(val); 
                        setVenOpen(true);
                        const match = vendors.find(v => v.name.toLowerCase() === val.toLowerCase());
                        if (match) setEditData(p => ({...p, vendor_id: match.id}));
                        else if (!val) setEditData(p => ({...p, vendor_id: ''}));
                      }}
                      onFocus={() => { setVenOpen(true) }}
                      autoComplete="off"
                    />
                    <svg className={`dropdown-icon transition-transform ${venOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {venOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setVenOpen(false)}></div>
                      <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                        {vendors.filter(v => v.name.toLowerCase().includes(venSearch.toLowerCase())).map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setEditData(p => ({...p, vendor_id: v.id}));
                              setVenSearch(v.name);
                              setVenOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input type="date" className="input" value={editData.purchase_date} onChange={e => setEditData(p => ({...p, purchase_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Expiry</label>
                  <input type="date" className="input" value={editData.warranty_expiry} onChange={e => setEditData(p => ({...p, warranty_expiry: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                  <input type="number" step="0.01" className="input" value={editData.cost} onChange={e => setEditData(p => ({...p, cost: e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea className="input" rows="3" value={editData.description} onChange={e => setEditData(p => ({...p, description: e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Update Image</label>
                  <input type="file" accept="image/*" className="input" onChange={e => setEditData(p => ({...p, image: e.target.files[0]}))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              {[
                ['Asset Code', asset.asset_code],
                ['Name', asset.name],
                ['Category', asset.category_name || '—'],
                ['Subcategory', asset.subcategory_name || '—'],
                ['Brand', asset.brand || '—'],
                ['Model', asset.model || '—'],
                ['Serial Number', asset.serial_number || '—'],
                ['Vendor', asset.vendor_name || '—'],
                ['Purchase Date', formatDate(asset.purchase_date)],
                ['Warranty Expiry', formatDate(asset.warranty_expiry)],
                ['Cost', asset.cost ? `฿${Number(asset.cost).toLocaleString()}` : '—'],
                ['Location', asset.location_name || '—'],
                ['Assigned To', asset.assigned_user_name || '—'],
                ['Description', asset.description || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-slate-800 mt-0.5">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Assignments' && (
        <div className="card !p-0 overflow-hidden">
          {(!asset.assignments || asset.assignments.length === 0) ? (
            <div className="text-center py-12 text-slate-400">No assignment history</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Assigned At</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Returned At</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Assigned By</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Note</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {asset.assignments.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium">{a.user_name}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(a.assigned_at)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(a.returned_at)}</td>
                    <td className="py-3 px-4 text-slate-500">{a.assigned_by_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{a.note || '—'}</td>
                    <td className="py-3 px-4">
                      {a.returned_at ? (
                        <span className="badge bg-slate-100 text-slate-600 border-slate-200">Returned</span>
                      ) : (
                        <span className="badge bg-blue-500/10 text-blue-700 border-blue-200">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Maintenance' && (
        <div className="card !p-0 overflow-hidden">
          {(!asset.maintenance || asset.maintenance.length === 0) ? (
            <div className="text-center py-12 text-slate-400">No maintenance records</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Issue</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Start</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">End</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {asset.maintenance.map(m => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 max-w-xs truncate">{m.issue_description}</td>
                    <td className="py-3 px-4 text-slate-500">{m.vendor_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{m.cost ? `฿${Number(m.cost).toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(m.start_date)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(m.end_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${m.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : m.status === 'in_progress' ? 'bg-blue-500/10 text-blue-700 border-blue-200' : 'bg-amber-500/10 text-amber-700 border-amber-200'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {m.status === 'pending' && (
                        <button onClick={() => handleUpdateMaintenance(m.id, 'in_progress')} className="text-xs text-primary-600 hover:text-primary-800 font-medium mr-2">Start</button>
                      )}
                      {m.status === 'in_progress' && (
                        <button onClick={() => handleUpdateMaintenance(m.id, 'completed')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Tickets' && (
        <div className="card !p-0 overflow-hidden">
          {(!asset.tickets || asset.tickets.length === 0) ? (
            <div className="text-center py-12 text-slate-400">No linked tickets</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Ticket ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {asset.tickets.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <Link to={`/admin/ticket/${t.ticket_id}`} className="text-primary-600 hover:text-primary-800 font-mono font-semibold">{t.ticket_id}</Link>
                    </td>
                    <td className="py-3 px-4">{t.issue_title}</td>
                    <td className="py-3 px-4">
                      <span className={`badge badge-${t.status?.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge badge-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Audit Log' && (
        <div className="card !p-0 overflow-hidden">
          {(!asset.logs || asset.logs.length === 0) ? (
            <div className="text-center py-12 text-slate-400">No activity logs</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {asset.logs.map(log => (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      log.action_type === 'created' ? 'bg-emerald-100 text-emerald-700'
                      : log.action_type === 'assigned' ? 'bg-blue-100 text-blue-700'
                      : log.action_type === 'returned' ? 'bg-purple-100 text-purple-700'
                      : log.action_type === 'maintenance' ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {log.action_type.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 capitalize">{log.action_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-400">by {log.actor_name || 'System'}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{log.description}</p>
                      <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Assign Asset</h2>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Name *</label>
                <input className="input" value={assignData.user_name} onChange={e => setAssignData(p => ({...p, user_name: e.target.value}))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User ID (optional)</label>
                <input type="number" className="input" value={assignData.user_id} onChange={e => setAssignData(p => ({...p, user_id: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                <textarea className="input" rows="2" value={assignData.note} onChange={e => setAssignData(p => ({...p, note: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMaintenanceModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Create Maintenance Record</h2>
            </div>
            <form onSubmit={handleCreateMaintenance} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Issue Description *</label>
                <textarea className="input" rows="3" value={maintData.issue_description} onChange={e => setMaintData(p => ({...p, issue_description: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Maintenance Vendor Combobox */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <div className="input-group">
                    <input 
                      className="input pr-10" 
                      placeholder="Search vendor..."
                      value={maintVenSearch || (vendors.find(v => v.id == maintData.vendor_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setMaintVenSearch(val); 
                        setMaintVenOpen(true);
                        const match = vendors.find(v => v.name.toLowerCase() === val.toLowerCase());
                        if (match) setMaintData(p => ({...p, vendor_id: match.id}));
                        else if (!val) setMaintData(p => ({...p, vendor_id: ''}));
                      }}
                      onFocus={() => { setMaintVenOpen(true) }}
                      autoComplete="off"
                    />
                    <svg className={`dropdown-icon transition-transform ${maintVenOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {maintVenOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setMaintVenOpen(false)}></div>
                      <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                        {vendors.filter(v => v.name.toLowerCase().includes(maintVenSearch.toLowerCase())).map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setMaintData(p => ({...p, vendor_id: v.id}));
                              setMaintVenSearch(v.name);
                              setMaintVenOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                  <input type="number" step="0.01" className="input" value={maintData.cost} onChange={e => setMaintData(p => ({...p, cost: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" className="input" value={maintData.start_date} onChange={e => setMaintData(p => ({...p, start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="input" value={maintData.status} onChange={e => setMaintData(p => ({...p, status: e.target.value}))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMaintenanceModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Image Full Screen Modal */}
      {showFullImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-12 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setShowFullImage(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-slate-300 p-2"
            onClick={() => setShowFullImage(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <img 
            src={asset.image_url} 
            alt={asset.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm bg-black/40 px-4 py-2 rounded-full">
            Click anywhere to close
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetDetail

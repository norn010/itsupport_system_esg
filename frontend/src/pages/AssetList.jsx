import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const STATUS_COLORS = {
  'Available': 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'In Use': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Repair': 'bg-amber-500/10 text-amber-700 border-amber-200',
  'Lost': 'bg-red-500/10 text-red-700 border-red-200',
  'Retired': 'bg-slate-500/10 text-slate-700 border-slate-200',
}

const AssetList = () => {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', category_id: '', location_id: '', search: '' })
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '', category_id: '', subcategory_id: '', brand: '', model: '',
    serial_number: '', purchase_date: '', warranty_expiry: '', cost: '',
    vendor_id: '', location_id: '', description: '', image: null
  })
  const [subcategories, setSubcategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [saving, setSaving] = useState(false)
  const [isAddingLoc, setIsAddingLoc] = useState(false)
  
  // Filter Combobox states
  const [fStatusOpen, setFStatusOpen] = useState(false)
  const [fCatOpen, setCatFOpen] = useState(false)
  const [fCatSearch, setFCatSearch] = useState('')
  const [fLocOpen, setLocFOpen] = useState(false)
  const [fLocSearch, setFLocSearch] = useState('')

  // Modal Combobox states
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const [subSearch, setSubSearch] = useState('')
  const [venOpen, setVenOpen] = useState(false)
  const [venSearch, setVenSearch] = useState('')
  const [locOpen, setLocOpen] = useState(false)
  const [locSearch, setLocSearch] = useState('')
  
  const locDropRef = useRef(null)
  const catDropRef = useRef(null)
  const subDropRef = useRef(null)
  const venDropRef = useRef(null)
  const catFRef = useRef(null)
  const locFRef = useRef(null)
  const statusFRef = useRef(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25, ...filters }
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await axios.get('/api/assets', { params })
      setAssets(res.data.assets || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const { data } = await axios.get('/api/assets/categories')
        if (Array.isArray(data)) setCategories(data)
      } catch (err) { console.error('Error fetching categories:', err) }

      try {
        const { data } = await axios.get('/api/locations')
        if (Array.isArray(data)) setLocations(data)
      } catch (err) { console.error('Error fetching locations:', err) }

      try {
        const { data } = await axios.get('/api/assets/vendors')
        if (Array.isArray(data)) setVendors(data)
      } catch (err) { console.error('Error fetching vendors:', err) }
    }
    loadLookups()

    const handleClickOutside = (e) => {
      if (locDropRef.current && !locDropRef.current.contains(e.target)) setLocOpen(false)
      if (catDropRef.current && !catDropRef.current.contains(e.target)) setCatOpen(false)
      if (subDropRef.current && !subDropRef.current.contains(e.target)) setSubOpen(false)
      if (venDropRef.current && !venDropRef.current.contains(e.target)) setVenOpen(false)
      if (catFRef.current && !catFRef.current.contains(e.target)) setCatFOpen(false)
      if (locFRef.current && !locFRef.current.contains(e.target)) setLocFOpen(false)
      if (statusFRef.current && !statusFRef.current.contains(e.target)) setFStatusOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (formData.category_id) {
      axios.get(`/api/assets/categories/${formData.category_id}/subcategories`)
        .then(res => setSubcategories(res.data))
        .catch(() => setSubcategories([]))
    } else {
      setSubcategories([])
    }
  }, [formData.category_id])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = new FormData()
      Object.keys(formData).forEach(key => {
        if (key === 'image') return; // Handled separately
        if (formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key])
        }
      })
      if (!formData.category_id && catSearch) data.append('category_name', catSearch);
      if (!formData.subcategory_id && subSearch) data.append('subcategory_name', subSearch);
      if (!formData.vendor_id && venSearch) data.append('vendor_name', venSearch);
      if (!formData.location_id && locSearch) data.append('location_name', locSearch);
      
      if (formData.image) {
        data.append('image', formData.image);
      }

      await axios.post('/api/assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShowCreateModal(false)
      setFormData({ name: '', category_id: '', subcategory_id: '', brand: '', model: '', serial_number: '', purchase_date: '', warranty_expiry: '', cost: '', vendor_id: '', location_id: '', description: '', image: null })
      setCatSearch(''); setSubSearch(''); setVenSearch(''); setLocSearch('');
      setFilters({ search: '', status: '', category_id: '', location_id: '' })
      setFCatSearch(''); setFLocSearch('');
      fetchAssets()
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating asset')
    } finally {
      setSaving(false)
    }
  }

  const handleAddNewLocation = async () => {
    const name = locSearch.trim()
    if (!name) return
    setIsAddingLoc(true)
    try {
      const { data } = await axios.post('/api/locations', { name })
      setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'th')))
      handleSelectLocation(data)
    } catch (err) {
      alert(err.response?.data?.message || 'ไม่สามารถเพิ่มสาขาได้')
    } finally {
      setIsAddingLoc(false)
    }
  }

  const handleSelectLocation = (loc) => {
    setFormData(p => ({...p, location_id: loc.id}));
    setLocSearch(loc.name);
    setLocOpen(false);
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const totalPages = Math.ceil(total / 25)
  const filteredLocations = locations.filter(l => l.name.toLowerCase().includes(locSearch.toLowerCase()))

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            IT Assets
          </h1>
          <p className="text-slate-500 mt-1">{total} assets registered</p>
        </div>
        <div className="flex gap-3">
          <Link to="/assets/dashboard" className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Dashboard
          </Link>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Asset
          </button>
        </div>
      </div>

      <div className="card mb-6 !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search code, name..."
            className="input !py-2 text-sm"
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
          
          <div className="relative" ref={statusFRef}>
            <div className="input-group">
              <input 
                className="input !py-2 text-sm pr-10 cursor-pointer" 
                placeholder="All Status"
                readOnly
                value={filters.status || 'All Status'}
                onClick={() => setFStatusOpen(!fStatusOpen)}
              />
              <button type="button" onClick={() => setFStatusOpen(!fStatusOpen)} className="absolute right-3 text-slate-400">
                <svg className={`w-4 h-4 transition-transform ${fStatusOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {fStatusOpen && (
              <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                <button onClick={() => { handleFilterChange('status', ''); setFStatusOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50">All Status</button>
                {['Available','In Use','Repair','Lost','Retired'].map(s => (
                  <button key={s} onClick={() => { handleFilterChange('status', s); setFStatusOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0">{s}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={catFRef}>
            <div className="input-group">
              <input 
                className="input !py-2 text-sm pr-10" 
                placeholder="All Categories"
                value={fCatSearch || (categories.find(c => c.id == filters.category_id)?.name || '')}
                onChange={e => { setFCatSearch(e.target.value); setCatFOpen(true) }}
                onFocus={() => { setCatFOpen(true) }}
                autoComplete="off"
              />
              <button type="button" onClick={() => setCatFOpen(!fCatOpen)} className="absolute right-3 text-slate-400">
                <svg className={`w-4 h-4 transition-transform ${fCatOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {fCatOpen && (
              <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                <button onClick={() => { handleFilterChange('category_id', ''); setFCatSearch(''); setCatFOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50">All Categories</button>
                {categories.filter(c => c.name.toLowerCase().includes(fCatSearch.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => { handleFilterChange('category_id', c.id); setFCatSearch(c.name); setCatFOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0">{c.name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={locFRef}>
            <div className="input-group">
              <input 
                className="input !py-2 text-sm pr-10" 
                placeholder="All Locations"
                value={fLocSearch || (locations.find(l => l.id == filters.location_id)?.name || '')}
                onChange={e => { setFLocSearch(e.target.value); setLocFOpen(true) }}
                onFocus={() => { setLocFOpen(true) }}
                autoComplete="off"
              />
              <button type="button" onClick={() => setLocFOpen(!fLocOpen)} className="absolute right-3 text-slate-400">
                <svg className={`w-4 h-4 transition-transform ${fLocOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {fLocOpen && (
              <div className="absolute z-[70] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                <button onClick={() => { handleFilterChange('location_id', ''); setFLocSearch(''); setLocFOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50">All Locations</button>
                {locations.filter(l => l.name.toLowerCase().includes(fLocSearch.toLowerCase())).map(l => (
                  <button key={l.id} onClick={() => { handleFilterChange('location_id', l.id); setFLocSearch(l.name); setLocFOpen(false) }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0">{l.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            No assets found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Brand / Model</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Assigned To</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-primary-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/assets/${asset.id}`} className="font-mono text-primary-600 hover:text-primary-800 font-semibold">
                        {asset.asset_code}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{asset.name}</td>
                    <td className="py-3 px-4 text-slate-500">{asset.category_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${STATUS_COLORS[asset.status] || 'bg-slate-100 text-slate-600'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{asset.location_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{asset.assigned_user_name || '—'}</td>
                    <td className="py-3 px-4">
                      <Link to={`/assets/${asset.id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary text-sm !px-3 !py-1.5 disabled:opacity-40">← Prev</button>
          <span className="flex items-center text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-secondary text-sm !px-3 !py-1.5 disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Register New Asset</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name *</label>
                  <input className="input" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
                </div>
                <div className="relative" ref={catDropRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <div className="relative flex items-center">
                    <input 
                      className="input pr-10" 
                      placeholder="Search category..."
                      value={catSearch || (categories.find(c => c.id == formData.category_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setCatSearch(val); 
                        setCatOpen(true);
                        const match = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                        if (match) setFormData(p => ({...p, category_id: match.id, subcategory_id: ''}));
                        else if (!val) setFormData(p => ({...p, category_id: '', subcategory_id: ''}));
                      }}
                      onFocus={() => { setCatOpen(true) }}
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => setCatOpen(!catOpen)} className="absolute right-3 text-slate-400">
                      <svg className={`w-5 h-5 transition-transform ${catOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {catOpen && (
                    <div className="absolute z-[110] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                      {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({...p, category_id: c.id, subcategory_id: ''}));
                            setCatSearch(c.name);
                            setCatOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subcategory Combobox */}
                <div className="relative" ref={subDropRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                  <div className="relative flex items-center">
                    <input 
                      className="input pr-10 disabled:opacity-50" 
                      placeholder="Search subcategory..."
                      disabled={!formData.category_id}
                      value={subSearch || (subcategories.find(s => s.id == formData.subcategory_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setSubSearch(val); 
                        setSubOpen(true);
                        const match = subcategories.find(s => s.name.toLowerCase() === val.toLowerCase());
                        if (match) setFormData(p => ({...p, subcategory_id: match.id}));
                        else if (!val) setFormData(p => ({...p, subcategory_id: ''}));
                      }}
                      onFocus={() => { setSubOpen(true) }}
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => setSubOpen(!subOpen)} disabled={!formData.category_id} className="absolute right-3 text-slate-400">
                      <svg className={`w-5 h-5 transition-transform ${subOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {subOpen && (
                    <div className="absolute z-[110] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                      {subcategories.filter(s => s.name.toLowerCase().includes(subSearch.toLowerCase())).map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({...p, subcategory_id: s.id}));
                            setSubSearch(s.name);
                            setSubOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input className="input" value={formData.brand} onChange={e => setFormData(p => ({...p, brand: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input className="input" value={formData.model} onChange={e => setFormData(p => ({...p, model: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                  <input className="input" value={formData.serial_number} onChange={e => setFormData(p => ({...p, serial_number: e.target.value}))} />
                </div>
                {/* Vendor Combobox */}
                <div className="relative" ref={venDropRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <div className="relative flex items-center">
                    <input 
                      className="input pr-10" 
                      placeholder="Search vendor..."
                      value={venSearch || (vendors.find(v => v.id == formData.vendor_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setVenSearch(val); 
                        setVenOpen(true);
                        const match = vendors.find(v => v.name.toLowerCase() === val.toLowerCase());
                        if (match) setFormData(p => ({...p, vendor_id: match.id}));
                        else if (!val) setFormData(p => ({...p, vendor_id: ''}));
                      }}
                      onFocus={() => { setVenOpen(true) }}
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => setVenOpen(!venOpen)} className="absolute right-3 text-slate-400">
                      <svg className={`w-5 h-5 transition-transform ${venOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {venOpen && (
                    <div className="absolute z-[110] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                      {vendors.filter(v => v.name.toLowerCase().includes(venSearch.toLowerCase())).map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({...p, vendor_id: v.id}));
                            setVenSearch(v.name);
                            setVenOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0"
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input type="date" className="input" value={formData.purchase_date} onChange={e => setFormData(p => ({...p, purchase_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Expiry</label>
                  <input type="date" className="input" value={formData.warranty_expiry} onChange={e => setFormData(p => ({...p, warranty_expiry: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                  <input type="number" step="0.01" className="input" value={formData.cost} onChange={e => setFormData(p => ({...p, cost: e.target.value}))} />
                </div>
                <div className="relative" ref={locDropRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <div className="relative flex items-center">
                    <input 
                      className="input pr-10" 
                      placeholder="Search or add location..."
                      value={locSearch || (locations.find(l => l.id == formData.location_id)?.name || '')}
                      onChange={e => { 
                        const val = e.target.value;
                        setLocSearch(val); 
                        setLocOpen(true);
                        setFormData(p => ({...p, location_id: ''}));
                      }}
                      onFocus={() => { setLocOpen(true) }}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setLocOpen(!locOpen)}
                      className="absolute right-3 text-slate-400 hover:text-primary-600 transition"
                    >
                      <svg className={`w-5 h-5 transition-transform ${locOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {locOpen && (
                    <div className="absolute z-[100] w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto animate-in slide-in-from-top-1">
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleSelectLocation(l)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium border-b border-slate-50 last:border-0 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {l.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-slate-400 text-sm text-center">ไม่พบสาขาที่ค้นหา</div>
                      )}
                      {locSearch.trim() && !locations.some(l => l.name.toLowerCase() === locSearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={handleAddNewLocation}
                          disabled={isAddingLoc}
                          className="w-full text-left px-4 py-2.5 text-primary-600 font-bold hover:bg-primary-50 transition border-t border-slate-100 flex items-center gap-2 text-sm"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {isAddingLoc ? 'กำลังเพิ่ม...' : `เพิ่มสาขาใหม่ "${locSearch.trim()}"`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Spacer to prevent modal clipping dropdown */}
                {locOpen && <div className="h-32 col-span-2"></div>}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset Image</label>
                  <input type="file" accept="image/*" className="input" onChange={e => setFormData(p => ({...p, image: e.target.files[0]}))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea className="input" rows="3" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Creating...' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetList

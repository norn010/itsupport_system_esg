import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { saveRecentTicket } from '../utils/ticketStorage'
import { getBrowserMetadata } from '../utils/browserInfo'

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    issue_title: '',
    description: '',
    priority: 'Medium',
    category_id: '',
    subcategory_id: '',
    asset_id: '',
    anydesk_id: '',
  })
  const [ticketType] = useState('general')
  const [computerName, setComputerName] = useState('')
  // Asset search state
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false)
  const [assetSearching, setAssetSearching] = useState(false)
  const assetSearchRef = useRef(null)
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [locations, setLocations] = useState([])
  const [locSearch, setLocSearch] = useState('')
  const [isLocDropOpen, setIsLocDropOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isAddingLoc, setIsAddingLoc] = useState(false)
  const locDropRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  useEffect(() => {
    fetchLocations()
    // Load saved computer name
    const savedComp = localStorage.getItem('last_computer_name');
    if (savedComp) setComputerName(savedComp);
  }, [])

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('/api/locations')
      setLocations(data)
    } catch (err) {
      console.error('Error fetching locations:', err)
    }
  }

  const filteredLocations = locations.filter(l =>
    l.name?.toLowerCase().includes(locSearch.toLowerCase())
  )

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc)
    setLocSearch(loc.name)
    setFormData(prev => ({ ...prev, department: loc.name }))
    setIsLocDropOpen(false)
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (assetSearchRef.current && !assetSearchRef.current.contains(e.target)) {
        setAssetDropdownOpen(false)
      }
      if (locDropRef.current && !locDropRef.current.contains(e.target)) {
        setIsLocDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced asset search
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetResults([]); return }
    const timer = setTimeout(async () => {
      setAssetSearching(true)
      try {
        const res = await axios.get('/api/assets', { params: { search: assetSearch, limit: 10 } })
        setAssetResults(res.data.assets || [])
        setAssetDropdownOpen(true)
      } catch { setAssetResults([]) }
      finally { setAssetSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [assetSearch])

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset)
    setFormData(prev => ({ ...prev, asset_id: asset.id }))
    setAssetSearch(`${asset.asset_code} – ${asset.name}`)
    setAssetDropdownOpen(false)
  }

  const handleClearAsset = () => {
    setSelectedAsset(null)
    setFormData(prev => ({ ...prev, asset_id: '' }))
    setAssetSearch('')
    setAssetResults([])
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    setFiles(selectedFiles)

    const urls = selectedFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const removeImage = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previewUrls.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviewUrls(newPreviews)
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const finalTitle = formData.issue_title
      const finalDescription = formData.description

      const data = new FormData()
      data.append('name', formData.name)
      data.append('department', formData.department)
      data.append('issue_title', finalTitle)
      data.append('description', finalDescription)
      data.append('priority', formData.priority)
      data.append('category_id', formData.category_id)
      data.append('subcategory_id', formData.subcategory_id)
      data.append('asset_id', formData.asset_id)
      data.append('anydesk_id', formData.anydesk_id)
      
      files.forEach(file => {
        data.append('images', file)
      })

      localStorage.setItem('last_computer_name', computerName);
      const metadata = getBrowserMetadata(selectedAsset);
      if (computerName) metadata.comp_name = computerName;
      metadata.ticket_type = ticketType;
      if (ticketType !== 'general') {
        metadata.special_fields = specialData;
      }

      data.append('metadata', JSON.stringify(metadata));

      const response = await axios.post('/api/tickets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(response.data.ticket)
      saveRecentTicket(response.data.ticket)
      setFormData({
        name: '',
        department: '',
        issue_title: '',
        description: '',
        priority: 'Medium',
        category_id: '',
        subcategory_id: '',
        asset_id: '',
        anydesk_id: '',
      })
      setSubcategories([])
      setFiles([])
      setPreviewUrls([])
      setSelectedAsset(null)
      setAssetSearch('')
      setAssetResults([])
      setLocSearch('')
      setSelectedLocation(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6">
        <div className="card text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">Ticket Created Successfully!</h2>
          <p className="text-gray-600 mb-4">Your ticket ID is:</p>
          <p className="text-3xl font-bold text-primary-600 mb-4">{success.ticket_id}</p>
          <p className="text-sm text-gray-500 mb-6">Save this ID to check your ticket status later.</p>
          <a href={`/ticket/${success.ticket_id}`} className="btn-primary inline-block">
            View Ticket
          </a>
          <button
            onClick={() => setSuccess(null)}
            className="btn-secondary ml-2"
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary-600 font-bold uppercase tracking-widest text-xs mb-8 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Hub
      </Link>
      <div className="card shadow-2xl border-primary-100 ring-4 ring-primary-50/50">
        <h1 className="text-2xl font-bold mb-6">Create IT Support Ticket</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}



        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">ชื่อผู้แจ้ง *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="ชื่อ-นามสกุล"
              />
            </div>

            <div className="relative" ref={locDropRef}>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                สาขา *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={locSearch}
                  onChange={(e) => {
                    setLocSearch(e.target.value)
                    setSelectedLocation(null)
                    setFormData(prev => ({ ...prev, department: '' }))
                    setIsLocDropOpen(true)
                  }}
                  onFocus={() => setIsLocDropOpen(true)}
                  className="input pr-10"
                  placeholder="ค้นหาหรือเพิ่มสาขาใหม่..."
                  autoComplete="off"
                  required={!formData.department}
                />
                <button
                  type="button"
                  onClick={() => setIsLocDropOpen(!isLocDropOpen)}
                  className="absolute right-3 text-slate-400 hover:text-primary-600 transition"
                >
                  <svg className={`w-5 h-5 transition-transform ${isLocDropOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {isLocDropOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-52 overflow-y-auto">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium border-b border-slate-50 dark:border-white/5 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {loc.name}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-slate-400 text-sm text-center">ไม่พบสาขาที่ค้นหา</div>
                  )}
                  {/* เพิ่มสาขาใหม่ */}
                  {locSearch.trim() && !filteredLocations.some(l => l.name.toLowerCase() === locSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleAddNewLocation}
                      disabled={isAddingLoc}
                      className="w-full text-left px-4 py-2.5 text-primary-600 font-bold hover:bg-primary-50 dark:hover:bg-white/5 transition border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-sm"
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
          </div>

          <div className="animate-in fade-in duration-500">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">หัวข้อเรื่อง *</label>
            <input
              type="text"
              name="issue_title"
              value={formData.issue_title}
              onChange={handleChange}
              className="input"
              required
              placeholder="สรุปปัญหาเบื้องต้น"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[120px]"
              rows="4"
              placeholder="อธิบายรายละเอียดของปัญหา..."
            />
          </div>



          {/* Asset Linking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🖥 Related Asset <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative" ref={assetSearchRef}>
              <div className="relative">
                <input
                  type="text"
                  value={assetSearch}
                  onChange={e => { setAssetSearch(e.target.value); setSelectedAsset(null); setFormData(p => ({ ...p, asset_id: '' })) }}
                  placeholder="Search by name, asset code, or serial number..."
                  className="input pr-16"
                  autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {assetSearching && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  )}
                  {selectedAsset && (
                    <button type="button" onClick={handleClearAsset}
                      className="text-gray-400 hover:text-red-500 text-xs font-bold px-1">✕</button>
                  )}
                </div>
              </div>

              {/* Dropdown results */}
              {assetDropdownOpen && assetResults.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {assetResults.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelectAsset(a)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 text-left transition"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'Available' ? 'bg-emerald-400'
                          : a.status === 'In Use' ? 'bg-blue-400'
                            : a.status === 'Repair' ? 'bg-amber-400' : 'bg-slate-300'
                        }`}></span>
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-primary-600 font-semibold mr-2">{a.asset_code}</span>
                        <span className="text-sm text-slate-700">{a.name}</span>
                        {a.brand && <span className="text-xs text-slate-400 ml-2">{a.brand} {a.model}</span>}
                      </div>
                      <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{a.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {assetDropdownOpen && assetSearch.trim() && assetResults.length === 0 && !assetSearching && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 px-4 py-3 text-sm text-slate-400">
                  No assets found matching "{assetSearch}"
                </div>
              )}
            </div>

            {/* Selected asset preview */}
            {selectedAsset && (
              <div className="mt-2 flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold flex-shrink-0">
                  {selectedAsset.asset_code?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary-800">{selectedAsset.asset_code} – {selectedAsset.name}</p>
                  <p className="text-xs text-primary-600">{[selectedAsset.brand, selectedAsset.model, selectedAsset.serial_number].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`ml-auto badge text-xs flex-shrink-0 ${selectedAsset.status === 'Available' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : selectedAsset.status === 'In Use' ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>{selectedAsset.status}</span>
              </div>
            )}
            {/* AnyDesk ID Input */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                🆔 AnyDesk ID <span className="text-gray-400 font-normal ml-1">(ถ้ามี)</span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="anydesk_id"
                  value={formData.anydesk_id}
                  onChange={handleChange}
                  className="input pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all group-hover:border-primary-300"
                  placeholder="เช่น 123 456 789"
                  maxLength="15"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary-500 transition-colors">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium italic">* เพื่อความรวดเร็วในการรีโมทช่วยเหลือจากเจ้าหน้าที่</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshots (max 5, max 5MB each)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="input py-2"
            />
          </div>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt="Preview" className="w-full h-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateTicket

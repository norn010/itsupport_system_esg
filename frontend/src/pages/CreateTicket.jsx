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
  const [ticketType, setTicketType] = useState('general') // general, voice_recording, cctv
  const [specialData, setSpecialData] = useState({
    phone: '',
    start_time: '',
    end_time: '',
  })
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
  const [existingDepartments, setExistingDepartments] = useState([])
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  useEffect(() => {
    axios.get('/api/tickets/departments')
      .then(res => setExistingDepartments(res.data.map(d => d.department)))
      .catch(err => console.error(err))

    // Load saved computer name
    const savedComp = localStorage.getItem('last_computer_name');
    if (savedComp) setComputerName(savedComp);
  }, [])

  // Close asset dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (assetSearchRef.current && !assetSearchRef.current.contains(e.target)) {
        setAssetDropdownOpen(false)
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

  const handleSpecialChange = (e) => {
    const { name, value } = e.target
    setSpecialData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let finalTitle = formData.issue_title
      let finalDescription = formData.description

      if (ticketType === 'voice_recording') {
        finalTitle = `ขอไฟล์บันทึกเสียง - ${formData.department || 'ไม่ระบุสาขา'}`
        finalDescription = `เบอร์โทรศัพท์: ${specialData.phone}\nเวลาเริ่มต้น: ${specialData.start_time}\nเวลาสิ้นสุด: ${specialData.end_time}\nสาขา/จุดที่ติดตั้ง: ${formData.department || 'ไม่ระบุ'}\nรายละเอียด: ${formData.description || '-'}`
      } else if (ticketType === 'cctv') {
        finalTitle = `ขอไฟล์กล้องวงจรปิด - ${formData.department || 'ไม่ระบุสาขา'}`
        finalDescription = `เวลาเริ่มต้น: ${specialData.start_time}\nเวลาสิ้นสุด: ${specialData.end_time}\nจุดที่ต้องการดู: ${formData.description || '-'}\nสาขา: ${formData.department || 'ไม่ระบุ'}`
      }

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
      setSpecialData({ phone: '', start_time: '', end_time: '' })
      setTicketType('general')
      setSubcategories([])
      setFiles([])
      setPreviewUrls([])
      setSelectedAsset(null)
      setAssetSearch('')
      setAssetResults([])
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

        {/* Ticket Type Tabs */}
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => setTicketType('general')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
              ticketType === 'general' 
                ? 'bg-white dark:bg-primary-600 shadow-md text-primary-600 dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            📋 แจ้งทั่วไป
          </button>
          <button
            type="button"
            onClick={() => setTicketType('voice_recording')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
              ticketType === 'voice_recording' 
                ? 'bg-white dark:bg-primary-600 shadow-md text-primary-600 dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            🎙️ บันทึกเสียง
          </button>
          <button
            type="button"
            onClick={() => setTicketType('cctv')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
              ticketType === 'cctv' 
                ? 'bg-white dark:bg-primary-600 shadow-md text-primary-600 dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            📸 กล้องวงจรปิด
          </button>
        </div>

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

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {ticketType === 'general' ? 'แผนก' : 'เลือกสาขา'} *
              </label>
              <div className="input-group">
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, department: e.target.value }));
                    setDeptDropdownOpen(true);
                  }}
                  onFocus={() => setDeptDropdownOpen(true)}
                  className="input pr-10"
                  placeholder={ticketType === 'general' ? "e.g., IT, HR, Sales" : "กรุณาเลือกหรือระบุสาขา"}
                  autoComplete="off"
                  required
                />
                <svg className={`dropdown-icon transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>

              {/* Custom Dropdown for Department */}
              {deptDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setDeptDropdownOpen(false)}></div>
                  <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 max-h-48 overflow-y-auto">
                    {(() => {
                      const uniqueDepts = Array.from(new Set(existingDepartments));
                      const filtered = uniqueDepts.filter(d =>
                        d.toLowerCase().includes(formData.department.toLowerCase())
                      );

                      if (filtered.length > 0) {
                        return filtered.map((dept, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, department: dept }));
                              setDeptDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium border-b border-slate-50 dark:border-white/5 last:border-0"
                          >
                            {dept}
                          </button>
                        ));
                      }
                      return null;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          {ticketType === 'voice_recording' && (
            <div className="p-6 bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-500/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <h3 className="text-sm font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider">ข้อมูลการร้องขอไฟล์เสียง</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์ที่ต้องการร้องขอ *</label>
                <input
                  type="text"
                  name="phone"
                  value={specialData.phone}
                  onChange={handleSpecialChange}
                  className="input"
                  required={ticketType === 'voice_recording'}
                  placeholder="เช่น 02-xxx-xxxx หรือ เบอร์ภายใน"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันเวลาเริ่มต้น *</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={specialData.start_time}
                    onChange={handleSpecialChange}
                    className="input"
                    required={ticketType === 'voice_recording'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันเวลาสิ้นสุด *</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={specialData.end_time}
                    onChange={handleSpecialChange}
                    className="input"
                    required={ticketType === 'voice_recording'}
                  />
                </div>
              </div>
            </div>
          )}

          {ticketType === 'cctv' && (
            <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">ข้อมูลการร้องขอไฟล์กล้อง</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันเวลาเริ่มต้น *</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={specialData.start_time}
                    onChange={handleSpecialChange}
                    className="input"
                    required={ticketType === 'cctv'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันเวลาสิ้นสุด *</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={specialData.end_time}
                    onChange={handleSpecialChange}
                    className="input"
                    required={ticketType === 'cctv'}
                  />
                </div>
              </div>
            </div>
          )}

          {ticketType === 'general' && (
            <div className="animate-in fade-in duration-500">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">หัวข้อเรื่อง *</label>
              <input
                type="text"
                name="issue_title"
                value={formData.issue_title}
                onChange={handleChange}
                className="input"
                required={ticketType === 'general'}
                placeholder="สรุปปัญหาเบื้องต้น"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {ticketType === 'general' ? 'รายละเอียดเพิ่มเติม' : (ticketType === 'cctv' ? 'รายละเอียด (จุดที่ต้องการดู)' : 'รายละเอียด/หมายเหตุ')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[120px]"
              rows="4"
              placeholder={ticketType === 'general' ? "อธิบายรายละเอียดของปัญหา..." : "ระบุรายละเอียดเพิ่มเติมเพื่อความรวดเร็วในการตรวจสอบ..."}
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

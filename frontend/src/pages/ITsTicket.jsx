import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const ITsTicket = () => {
  const { user } = useAuth()

  const [ticketType, setTicketType] = useState('voice_recording') // voice_recording | cctv

  // Locations combobox (same as ITsRackPhoto)
  const [locations, setLocations] = useState([])
  const [locSearch, setLocSearch] = useState('')
  const [isLocDropOpen, setIsLocDropOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isAddingLoc, setIsAddingLoc] = useState(false)
  const locDropRef = useRef(null)

  const [formData, setFormData] = useState({
    name: user?.full_name || user?.username || '',
    department: '',
    description: '',
  })
  const [specialData, setSpecialData] = useState({
    phone: '',
    start_time: '',
    end_time: '',
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLocations()
    const handleClickOutside = (e) => {
      if (locDropRef.current && !locDropRef.current.contains(e.target)) {
        setIsLocDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSpecialChange = (e) => {
    setSpecialData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let finalTitle = ''
      let finalDescription = ''

      if (ticketType === 'voice_recording') {
        finalTitle = `ขอไฟล์บันทึกเสียง - ${formData.department || 'ไม่ระบุสาขา'}`
        finalDescription = `เบอร์โทรศัพท์: ${specialData.phone}\nเวลาเริ่มต้น: ${specialData.start_time}\nเวลาสิ้นสุด: ${specialData.end_time}\nสาขา/จุดที่ติดตั้ง: ${formData.department || 'ไม่ระบุ'}\nรายละเอียด: ${formData.description || '-'}`
      } else {
        finalTitle = `ขอไฟล์กล้องวงจรปิด - ${formData.department || 'ไม่ระบุสาขา'}`
        finalDescription = `เวลาเริ่มต้น: ${specialData.start_time}\nเวลาสิ้นสุด: ${specialData.end_time}\nจุดที่ต้องการดู: ${formData.description || '-'}\nสาขา: ${formData.department || 'ไม่ระบุ'}`
      }

      const data = new FormData()
      data.append('name', formData.name)
      data.append('department', formData.department)
      data.append('issue_title', finalTitle)
      data.append('description', finalDescription)
      data.append('priority', 'Medium')
      data.append('metadata', JSON.stringify({
        ticket_type: ticketType,
        special_fields: specialData,
        source: "IT's Ticket"
      }))

      const response = await axios.post('/api/tickets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(response.data.ticket)
      setFormData({ name: user?.full_name || user?.username || '', department: '', description: '' })
      setSpecialData({ phone: '', start_time: '', end_time: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white drop-shadow-lg">IT's Ticket</h1>
          <p className="text-purple-200 mt-1 text-sm">แจ้งคำขอไฟล์บันทึกเสียง / กล้องวงจรปิด</p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">ส่ง Ticket สำเร็จ!</h2>
            <p className="text-slate-500 mb-2">หมายเลข Ticket ของคุณ:</p>
            <p className="text-3xl font-black text-purple-600 mb-6">{success.ticket_id}</p>
            <p className="text-xs text-slate-400 mb-6">บันทึกหมายเลขนี้ไว้เพื่อตรวจสอบสถานะภายหลัง</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a
                href={`/ticket/${success.ticket_id}`}
                className="px-8 py-3 rounded-2xl font-black text-white text-sm shadow-lg transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)' }}
              >
                ดู Ticket
              </a>
              <button
                onClick={() => setSuccess(null)}
                className="px-8 py-3 rounded-2xl font-black text-purple-700 text-sm bg-purple-100 hover:bg-purple-200 transition-all active:scale-95"
              >
                แจ้งรายการใหม่
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">

            {/* Type Tabs */}
            <div className="flex bg-white/10 p-1 rounded-2xl mb-8 gap-1">
              <button
                type="button"
                onClick={() => setTicketType('voice_recording')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  ticketType === 'voice_recording'
                    ? 'bg-white text-purple-700 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                บันทึกเสียง
              </button>
              <button
                type="button"
                onClick={() => setTicketType('cctv')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  ticketType === 'cctv'
                    ? 'bg-white text-purple-700 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                กล้องวงจรปิด
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 bg-red-100 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ชื่อผู้แจ้ง */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">ชื่อผู้แจ้ง *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="ชื่อ-นามสกุล"
                  className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              {/* สาขา combobox — ดึงจาก locations collection เหมือน ITsRackPhoto */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">สาขา *</label>
                <div className="relative" ref={locDropRef}>
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
                      required={!selectedLocation}
                      placeholder="ค้นหาหรือเพิ่มสาขาใหม่..."
                      className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 pr-10 text-sm focus:outline-none focus:border-purple-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setIsLocDropOpen(!isLocDropOpen)}
                      className="absolute right-3 text-slate-400 hover:text-purple-600 transition"
                    >
                      <svg className={`w-5 h-5 transition-transform ${isLocDropOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {isLocDropOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-52 overflow-y-auto">
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map(loc => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2"
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
                          className="w-full text-left px-4 py-3 text-sm text-purple-600 font-bold hover:bg-purple-50 transition border-t border-slate-100 flex items-center gap-2"
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

              {/* Voice Recording fields */}
              {ticketType === 'voice_recording' && (
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <h3 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    ข้อมูลการร้องขอไฟล์เสียง
                  </h3>
                  <div>
                    <label className="block text-sm font-bold text-white/80 mb-2">เบอร์โทรศัพท์ที่ต้องการร้องขอ *</label>
                    <input
                      type="text"
                      name="phone"
                      value={specialData.phone}
                      onChange={handleSpecialChange}
                      required
                      placeholder="เช่น 02-xxx-xxxx หรือ เบอร์ภายใน"
                      className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2">วันเวลาเริ่มต้น *</label>
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={specialData.start_time}
                        onChange={handleSpecialChange}
                        required
                        className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2">วันเวลาสิ้นสุด *</label>
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={specialData.end_time}
                        onChange={handleSpecialChange}
                        required
                        className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CCTV fields */}
              {ticketType === 'cctv' && (
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <h3 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    ข้อมูลการร้องขอไฟล์กล้องวงจรปิด
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2">วันเวลาเริ่มต้น *</label>
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={specialData.start_time}
                        onChange={handleSpecialChange}
                        required
                        className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white/80 mb-2">วันเวลาสิ้นสุด *</label>
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={specialData.end_time}
                        onChange={handleSpecialChange}
                        required
                        className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* รายละเอียดเพิ่มเติม */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  {ticketType === 'cctv' ? 'จุดที่ต้องการดู / รายละเอียด' : 'รายละเอียด / หมายเหตุ'}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="ระบุรายละเอียดเพิ่มเติมเพื่อความรวดเร็วในการตรวจสอบ..."
                  className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg mt-2"
                style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังส่ง...
                  </span>
                ) : 'ส่ง Ticket'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default ITsTicket

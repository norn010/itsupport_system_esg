import React, { useState, useEffect } from 'react'
import axios from 'axios'

const ITsRackDashboard = () => {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/rack-photos')
      setPhotos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = photos.filter(p => {
    const matchSearch = !search ||
      p.location_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.recorded_by?.toLowerCase().includes(search.toLowerCase())
    const matchDate = !dateFilter || p.date === dateFilter
    return matchSearch && matchDate
  })

  // Group counts by location
  const locationCounts = photos.reduce((acc, p) => {
    acc[p.location_name] = (acc[p.location_name] || 0) + 1
    return acc
  }, {})
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            IT's Rack Photo Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">ดูภาพตู้ Rack ที่บันทึกจากสาขาต่างๆ</p>
        </div>
        <button onClick={fetchPhotos} className="btn-secondary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-purple-700">{photos.length}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">ทั้งหมด</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-indigo-700">{Object.keys(locationCounts).length}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">จำนวนสาขา</p>
        </div>
        {topLocations.slice(0, 2).map(([name, count]) => (
          <div key={name} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-slate-700">{count}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{name}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาสาขา หรือผู้บันทึก..."
          className="input flex-1 min-w-[200px] text-sm"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="input w-auto text-sm"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="btn-secondary text-sm">
            ล้างวันที่
          </button>
        )}
      </div>

      {/* Grid / Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <p className="font-bold text-slate-300">ไม่พบข้อมูลภาพตู้ Rack</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(photo => (
            <div
              key={photo.id}
              className="card p-0 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Image */}
              <div className="h-44 bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden relative">
                {photo.file_path ? (
                  <img
                    src={photo.file_path}
                    alt={photo.location_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ display: photo.file_path ? 'none' : 'flex' }}
                >
                  <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                {/* Date badge */}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {photo.date || '-'}
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span className="text-sm font-black text-slate-800 truncate">{photo.location_name}</span>
                </div>
                <p className="text-xs text-slate-400">บันทึกโดย: <span className="font-semibold text-slate-600">{photo.recorded_by}</span></p>
                {photo.image_name && (
                  <p className="text-xs text-slate-300 truncate mt-0.5">{photo.image_name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {selectedPhoto.file_path && (
              <img
                src={selectedPhoto.file_path}
                alt={selectedPhoto.location_name}
                className="w-full max-h-[60vh] object-contain bg-slate-100"
              />
            )}
            <div className="p-5 space-y-2">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {selectedPhoto.location_name}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">วันที่บันทึก</p>
                  <p className="font-bold text-slate-800">{selectedPhoto.date}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">บันทึกโดย</p>
                  <p className="font-bold text-slate-800">{selectedPhoto.recorded_by}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full mt-2 py-3 rounded-2xl font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ITsRackDashboard

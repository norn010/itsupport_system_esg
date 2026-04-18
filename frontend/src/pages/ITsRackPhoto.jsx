import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ITsRackPhoto = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Today's date locked
  const todayStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const todayISO = new Date().toISOString().split('T')[0];

  const [locations, setLocations] = useState([]);
  const [locSearch, setLocSearch] = useState('');
  const [isLocDropOpen, setIsLocDropOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [newLocName, setNewLocName] = useState('');
  const [isAddingLoc, setIsAddingLoc] = useState(false);

  const [recordedBy, setRecordedBy] = useState(user?.full_name || user?.username || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const locDropRef = useRef(null);

  useEffect(() => {
    fetchLocations();
    const handleClickOutside = (e) => {
      if (locDropRef.current && !locDropRef.current.contains(e.target)) {
        setIsLocDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('/api/locations');
      setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const filteredLocations = locations.filter(l =>
    l.name?.toLowerCase().includes(locSearch.toLowerCase())
  );

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    setLocSearch(loc.name);
    setIsLocDropOpen(false);
  };

  const handleAddNewLocation = async () => {
    const name = locSearch.trim();
    if (!name) return;
    setIsAddingLoc(true);
    try {
      const { data } = await axios.post('/api/locations', { name });
      setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'th')));
      setSelectedLocation(data);
      setLocSearch(data.name);
      setIsLocDropOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'ไม่สามารถเพิ่มสาขาได้');
    } finally {
      setIsAddingLoc(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedLocation) return setError('กรุณาเลือกสาขา');
    if (!recordedBy.trim()) return setError('กรุณาระบุชื่อผู้บันทึก');
    setError('');
    setSubmitting(true);
    try {
      await axios.post('/api/rack-photos', {
        location_id: selectedLocation.id,
        location_name: selectedLocation.name,
        recorded_by: recordedBy.trim(),
        date: todayISO,
        image_data: imagePreview,
        image_name: imageName
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedLocation(null);
    setLocSearch('');
    setRecordedBy(user?.full_name || user?.username || '');
    setImageFile(null);
    setImagePreview(null);
    setImageName('');
    setSuccess(false);
    setError('');
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white drop-shadow-lg">
            อัพโหลดภาพตู้ Rack
          </h1>
          <p className="text-purple-200 mt-1 text-sm">บันทึกภาพตู้ Rack ประจำสาขา</p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">บันทึกสำเร็จ!</h2>
            <p className="text-slate-500 mb-6">ข้อมูลภาพตู้ Rack ถูกบันทึกเรียบร้อยแล้ว</p>
            <button
              onClick={handleReset}
              className="btn-primary px-8"
            >
              บันทึกรายการใหม่
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-5">
                {/* สาขา Combobox */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">สาขา</label>
                  <div className="relative" ref={locDropRef}>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={locSearch}
                        onChange={(e) => {
                          setLocSearch(e.target.value);
                          setSelectedLocation(null);
                          setIsLocDropOpen(true);
                        }}
                        onFocus={() => setIsLocDropOpen(true)}
                        placeholder="ค้นหาหรือเพิ่มสาขาใหม่..."
                        className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 pr-10 text-sm focus:outline-none focus:border-purple-400 transition"
                      />
                      <button
                        onClick={() => setIsLocDropOpen(!isLocDropOpen)}
                        className="absolute right-3 text-slate-400 hover:text-purple-600 transition"
                        type="button"
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
                        {/* Add new option */}
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

                {/* บันทึกโดย */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">บันทึกโดย</label>
                  <input
                    type="text"
                    value={recordedBy}
                    onChange={(e) => setRecordedBy(e.target.value)}
                    placeholder="ชื่อผู้บันทึก"
                    className="w-full rounded-xl border-2 border-white/30 bg-white text-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition"
                  />
                  <p className="text-purple-200 text-xs mt-1.5 font-medium">**กรุณาพิมพ์ชื่อผู้ลงข้อมูล</p>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-5">
                {/* วันที่บันทึก - locked to today */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">วันที่บันทึก</label>
                  <div className="flex items-center gap-2 bg-white/30 text-white rounded-xl px-4 py-3 text-sm font-medium border-2 border-white/20">
                    <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {todayStr}
                  </div>
                </div>

                {/* แนบรูปภาพ */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">แนบรูปภาพ</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[180px] rounded-2xl bg-white border-2 border-dashed border-purple-300 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col overflow-hidden"
                  >
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <img
                          src={imagePreview}
                          alt="preview"
                          className="w-full h-full object-contain p-2 max-h-52"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 font-medium truncate px-2">
                          {imageName}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-slate-400">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-400">ยังไม่พบรูปภาพที่แนบเข้ามา</p>
                        <p className="text-xs text-purple-500 font-bold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          กดที่นี้ เพื่อแนบรูปภาพ
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-100 text-red-600 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8 justify-center">
              <button
                onClick={() => navigate(-1)}
                type="button"
                className="px-10 py-3.5 rounded-2xl font-black text-white text-base transition-all active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                type="button"
                className="px-10 py-3.5 rounded-2xl font-black text-white text-base transition-all active:scale-95 shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ITsRackPhoto;

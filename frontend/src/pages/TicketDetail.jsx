import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import InternalNotes from '../components/InternalNotes'
import ActivityTimeline from '../components/ActivityTimeline'
import notificationSound from '../sound/notification_message-notification-alert-8-331718.m4a'

const TicketDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState('')
  const typingTimeoutRef = useRef(null)
  const socketRef = useRef(null)

  // Asset linking state
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState([])
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false)
  const [assetSearching, setAssetSearching] = useState(false)
  const [showAssetSearch, setShowAssetSearch] = useState(false)
  const [savingAsset, setSavingAsset] = useState(false)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [catName, setCatName] = useState('')
  const [subCatName, setSubCatName] = useState('')
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const [subCatDropdownOpen, setSubCatDropdownOpen] = useState(false)
  const assetSearchRef = useRef(null)

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleSelectedFile(files[0])
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile();
      if (file) {
        handleSelectedFile(file);
      }
    }
  }

  const handleSelectedFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setPreviewImage(URL.createObjectURL(file))
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    // Handle Firestore Timestamp { _seconds, _nanoseconds }
    if (dateInput && typeof dateInput === 'object' && dateInput._seconds) {
      return new Date(dateInput._seconds * 1000).toLocaleString('th-TH');
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderDescription = (text) => {
    if (!text) return 'No description provided.';
    
    // If it's a multi-line formatted description from our new form
    let lines = text.split('\n').filter(l => l.trim());
    
    // Filter out redundant technical lines if metadata card is present
    if (ticket?.metadata?.ticket_type && ticket.metadata.ticket_type !== 'general') {
       lines = lines.filter(line => {
         const labelsToHide = ['เบอร์โทรศัพท์', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'เริ่ม', 'สิ้นสุด', 'สาขา', 'จุดที่ติดตั้ง', 'สาขา/จุดที่ติดตั้ง'];
         return !labelsToHide.some(label => line.startsWith(label + ':'));
       });
    }

    if (lines.length > 0) {
      return (
        <div className="space-y-3">
          {lines.map((line, i) => {
            if (line.includes(': ')) {
              const [label, ...valParts] = line.split(': ');
              const val = valParts.join(': ');
              // Skip if value is just '-' (empty note)
              if (val.trim() === '-' && lines.length > 1) return null;

              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-3 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">{label}</span>
                  <span className="text-sm font-bold text-slate-800">{renderMessage(val)}</span>
                </div>
              );
            }
            return <div key={i} className="text-slate-700">{renderMessage(line)}</div>;
          }).filter(l => l !== null)}
        </div>
      );
    }
    return null;
  };

  const renderMessage = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (typeof part === 'string' && part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity break-all font-bold italic text-primary-600"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return
    setSending(true)

    // Stop typing immediately when sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socketRef.current.emit('stop_typing', { ticketId: ticket.id })

    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      formData.append('sender_type', 'staff');
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await axios.post(`/api/tickets/${ticket.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setNewMessage('')
      setSelectedFile(null)
      setPreviewImage(null)
    } catch (err) {
      console.error('Error saving message:', err)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchTicket()
    fetchStaff()
    fetchCategories()
  }, [id])

  useEffect(() => {
    if (ticket?.category_id) {
      fetchSubcategories(ticket.category_id)
    } else {
      setSubcategories([])
    }
  }, [ticket?.category_id])

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories')
      setCategories(res.data)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchSubcategories = async (categoryId) => {
    try {
      const res = await axios.get(`/api/categories/${categoryId}/subcategories`)
      setSubcategories(res.data)
    } catch (err) {
      console.error('Error fetching subcategories:', err)
    }
  }

  useEffect(() => {
    if (!ticket?.id) return

    socketRef.current = io()
    socketRef.current.emit('join_ticket', ticket.id)
    
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
      if (message.sender_type === 'user') {
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.log('Audio error:', e));
      }
    })

    socketRef.current.on('typing', ({ userName }) => {
      setTypingUser(userName)
      setIsTyping(true)
    })

    socketRef.current.on('stop_typing', () => {
      setIsTyping(false)
      setTypingUser('')
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [ticket?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (ticket) {
      if (categories.length > 0) {
        const currentCat = categories.find(c => String(c.id) === String(ticket.category_id));
        if (currentCat) setCatName(currentCat.name);
        else if (ticket.category_name) setCatName(ticket.category_name);
      } else if (ticket.category_name) {
        setCatName(ticket.category_name);
      }
      
      if (subcategories.length > 0) {
        const currentSub = subcategories.find(sc => String(sc.id) === String(ticket.subcategory_id));
        if (currentSub) setSubCatName(currentSub.name);
        else if (ticket.subcategory_name) setSubCatName(ticket.subcategory_name);
      } else if (ticket.subcategory_name) {
        setSubCatName(ticket.subcategory_name);
      }
    }
  }, [ticket?.id, ticket?.category_id, ticket?.subcategory_id, categories, subcategories])

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/search/${id}`)
      setTicket(response.data)
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/tickets/staff/it')
      setStaff(response.data)
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleUpdateTicket = async (updates) => {
    try {
      const response = await axios.patch(`/api/tickets/${id}`, updates)
      const updated = response.data.ticket
      setTicket(updated)
      
      // Refresh local names immediately
      if (updated.category_name) setCatName(updated.category_name)
      if (updated.subcategory_name) setSubCatName(updated.subcategory_name)

      // Refresh lists if new items were created by name
      if (updates.category_name) {
        await fetchCategories()
      }
      if (updates.subcategory_name || updates.category_name || updates.category_id) {
        if (updated.category_id) {
          await fetchSubcategories(updated.category_id)
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Asset linking ────────────────────────────────────────────
  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (assetSearchRef.current && !assetSearchRef.current.contains(e.target)) {
        setAssetDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced live search
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetResults([]); return }
    const timer = setTimeout(async () => {
      setAssetSearching(true)
      try {
        const res = await axios.get('/api/assets', { params: { search: assetSearch, limit: 8 } })
        setAssetResults(res.data.assets || [])
        setAssetDropdownOpen(true)
      } catch { setAssetResults([]) }
      finally { setAssetSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [assetSearch])

  const handleLinkAsset = async (asset) => {
    setSavingAsset(true)
    try {
      const response = await axios.patch(`/api/tickets/${ticket.id}`, { asset_id: asset.id })
      setTicket(response.data.ticket)
      setShowAssetSearch(false)
      setAssetSearch('')
      setAssetResults([])
    } catch (err) {
      alert(err.response?.data?.message || 'Could not link asset')
    } finally { setSavingAsset(false) }
  }

  const handleUnlinkAsset = async () => {
    if (!confirm('Remove asset link from this ticket?')) return
    setSavingAsset(true)
    try {
      const response = await axios.patch(`/api/tickets/${ticket.id}`, { asset_id: null })
      setTicket(response.data.ticket)
    } catch (err) {
      alert('Could not unlink asset')
    } finally { setSavingAsset(false) }
  }

  const getStatusBadge = (status) => {
    const normalized = status?.toLowerCase().replace(' ', '-') || 'open'
    const classes = {
      'open': 'badge-open',
      'in-progress': 'badge-in-progress',
      'resolved': 'badge-resolved',
      'closed': 'badge-closed',
    }
    return <span className={classes[normalized] || 'badge'}>{status}</span>
  }

  const getPriorityBadge = (priority) => {
    const classes = {
      'High': 'badge-high',
      'Medium': 'badge-medium',
      'Low': 'badge-low',
    }
    return <span className={classes[priority] || 'badge'}>{priority}</span>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6">
        <div className="card text-center py-12">
          <p className="text-xl text-slate-500 mb-4">Ticket not found.</p>
          <Link to="/tickets" className="btn-primary">Back to List</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowQR(false)}>
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center gap-4 border border-white" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1 w-16 bg-slate-100 rounded-full mb-2"></div>
            <h3 className="text-2xl font-black text-slate-900">Ticket QR Code</h3>
            <p className="text-slate-500 text-sm mb-2">Scan to access this ticket on mobile</p>
            <div className="p-6 bg-white border-[12px] border-slate-50 rounded-[2rem] shadow-inner">
              <QRCodeSVG value={window.location.href} size={240} />
            </div>
            <div className="mt-4 flex flex-col items-center">
               <span className="text-xs font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full mb-1">{ticket.ticket_id}</span>
            </div>
            <button onClick={() => setShowQR(false)} className="mt-6 btn-secondary w-full py-4 rounded-2xl text-base font-bold">Close Window</button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{ticket.ticket_id}</h1>
            <div className="flex gap-2">
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
          </div>
          <p className="text-slate-500 font-medium text-lg">
            {ticket.issue_title}
            <span className="ml-3 text-sm opacity-60">Created: {formatDate(ticket.created_at)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              copied 
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' 
              : 'bg-white text-slate-600 border-slate-200 hover:border-primary-500 hover:text-primary-600'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                <span className="hidden xs:inline">Copied!</span>
                <span className="xs:hidden">✓</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                <span className="hidden xs:inline">Copy Link</span>
                <span className="xs:hidden">Link</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setShowQR(true)}
            className="p-2.5 bg-white text-slate-500 border border-slate-200 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
            title="View QR Code"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </button>
          
          <Link to="/tickets" className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span className="hidden xs:inline">Back to List</span>
            <span className="xs:hidden">Back</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content (Left Column - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Special Request Details for Voice/CCTV */}
          {ticket.metadata?.ticket_type && ticket.metadata.ticket_type !== 'general' && (
            <div className={`card shadow-sm border-slate-200 overflow-hidden mb-6 ${
              ticket.metadata.ticket_type === 'voice_recording' ? 'bg-primary-50/20 border-primary-100' : 'bg-indigo-50/20 border-indigo-100'
            }`}>
              <div className={`px-6 py-4 flex items-center gap-2 border-b ${
                ticket.metadata.ticket_type === 'voice_recording' ? 'bg-primary-50/50 border-primary-100/50' : 'bg-indigo-50/50 border-indigo-100/50'
              }`}>
                <div className={`p-2 rounded-lg flex items-center justify-center ${
                  ticket.metadata.ticket_type === 'voice_recording' ? 'bg-primary-100 text-primary-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  <span className="text-xl">{ticket.metadata.ticket_type === 'voice_recording' ? '🎙️' : '📸'}</span>
                </div>
                <h2 className="font-bold text-slate-800">
                  {ticket.metadata.ticket_type === 'voice_recording' ? 'Voice Recording Details' : 'CCTV Request Details'}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {ticket.metadata.special_fields?.phone && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Phone Number</p>
                    <p className="text-lg font-extrabold text-slate-900 leading-tight">{ticket.metadata.special_fields.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Location / Branch</p>
                  <p className="text-lg font-extrabold text-slate-900 leading-tight">{ticket.department || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Start Time</p>
                  <p className="text-base font-bold text-slate-800">
                    {ticket.metadata.special_fields?.start_time ? new Date(ticket.metadata.special_fields.start_time).toLocaleString('th-TH', { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">End Time</p>
                  <p className="text-base font-bold text-slate-800">
                    {ticket.metadata.special_fields?.end_time ? new Date(ticket.metadata.special_fields.end_time).toLocaleString('th-TH', { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Issue Description Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h2 className="font-bold text-slate-800">Issue Description</h2>
            </div>
            <div className="p-6 prose prose-slate max-w-none text-slate-700 leading-relaxed min-h-[120px] whitespace-pre-wrap text-base bg-slate-50/20">
              {renderDescription(ticket.description)}
            </div>
          </div>

          {/* Attachments Section — Between Description and Chat */}
          {ticket.images?.length > 0 && (
            <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h2 className="font-bold text-slate-800">Attachments ({ticket.images.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {ticket.images.map((img, index) => (
                    <div key={index} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer shadow-sm hover:ring-4 hover:ring-amber-100 transition-all duration-300" onClick={() => setSelectedImage(img)}>
                      <img src={img} alt="Attach" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Section — Full Width in main column */}
          <div 
            className={`card shadow-sm border-slate-200 bg-white flex flex-col h-[700px] transition-all duration-300 ${isDragging ? 'ring-4 ring-indigo-500 ring-opacity-50 !border-indigo-400 scale-[1.005]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <h2 className="font-bold text-slate-800">Ticket Conversation</h2>
              </div>
              <div className="flex items-center gap-2">
                 <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{messages.length} messages</span>
              </div>
            </div>
            
            <div className={`p-6 bg-slate-50/30 flex-1 overflow-y-auto border-b border-slate-100 scrollbar-thin scrollbar-thumb-slate-200 relative ${isDragging ? '!bg-indigo-50/50' : ''}`}>
              {isDragging && (
                <div className="absolute inset-x-6 inset-y-6 z-10 bg-indigo-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-indigo-400 rounded-3xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                  <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-indigo-50">
                    <div className="text-5xl animate-bounce">🖼️</div>
                    <p className="font-black text-indigo-600 uppercase tracking-widest text-sm">Drop to share image</p>
                  </div>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to respond to this request.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-4 shadow-sm ${
                        msg.sender_type === 'staff' 
                        ? 'bg-indigo-600 text-white rounded-br-none ring-4 ring-indigo-50 shadow-indigo-100' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-slate-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{msg.sender_name}</span>
                          <span className="text-[11px] opacity-60 font-medium whitespace-nowrap">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        {msg.file_path && (
                          <div className="mb-3">
                            {msg.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <div className="rounded-xl overflow-hidden border border-black/5 cursor-pointer hover:ring-2 hover:ring-white/20 transition" onClick={() => setSelectedImage(msg.file_path)}>
                                <img src={msg.file_path} alt="Chat attachment" className="w-full h-auto max-h-80 object-cover" />
                              </div>
                            ) : (
                              <a 
                                href={msg.file_path} 
                                download 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                  msg.sender_type === 'staff' 
                                  ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <div className={`p-2 rounded-lg ${msg.sender_type === 'staff' ? 'bg-white/20' : 'bg-primary-100 text-primary-600'}`}>
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{msg.file_path.split('/').pop()}</p>
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 group-hover:text-indigo-400 transition-colors">
                                    {formatDate(msg.created_at)}
                                  </span>
                                </div>
                                <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l3 3m-3-3L9 7"></path></svg>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.message && <div className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{renderMessage(msg.message)}</div>}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 italic animate-pulse">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      {typingUser} is typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 bg-white">
              {previewImage && (
                <div className="relative inline-block mb-4 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-lg animate-in zoom-in duration-200">
                  {selectedFile?.type.startsWith('image/') ? (
                    <img src={previewImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl" />
                  ) : (
                    <div className="h-32 w-32 bg-primary-50 rounded-xl flex flex-col items-center justify-center gap-2 border border-primary-100">
                      <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest px-2 truncate w-full text-center">{selectedFile?.name}</span>
                    </div>
                  )}
                  <button onClick={() => { setPreviewImage(null); setSelectedFile(null); }} className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-xl hover:bg-rose-600 transition hover:scale-110 active:scale-95 ring-4 ring-white">✕</button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <div className="flex-1 relative group">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      
                      // Typing Indicator logic
                      if (socketRef.current) {
                        socketRef.current.emit('typing', { 
                          ticketId: ticket.id, 
                          userName: user.full_name || 'Staff' 
                        })
                        
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current.emit('stop_typing', { ticketId: ticket.id })
                        }, 3000)
                      }
                    }} 
                    onPaste={handlePaste} 
                    placeholder="Write a message to the user..." 
                    className="input w-full pr-14 py-3.5 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all rounded-2xl text-base shadow-sm"
                    autoComplete="off" 
                    disabled={sending} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors w-10 h-10 flex items-center justify-center hover:bg-indigo-50 rounded-xl"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="*" onChange={(e) => handleSelectedFile(e.target.files[0])} />
                <button 
                  type="submit" 
                  className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all transform active:scale-95 flex items-center gap-2 h-[54px]"
                  disabled={sending}
                >
                  {sending ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div> : <span>Send Response</span>}
                </button>
              </form>
            </div>
          </div>

          <ActivityTimeline ticketId={ticket.ticket_id} />
        </div>

        {/* Sidebar (Right Column - 1/3) */}
        <div className="space-y-6">
          
          {/* Status & Assignment Card */}
          <div className={`card shadow-md border-primary-100 bg-white ring-1 ring-primary-50 transition-all duration-300 ${(catDropdownOpen || subCatDropdownOpen) ? 'relative z-[100]' : 'relative'}`}>
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              Management
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Current Status</label>
                <select 
                  value={ticket.status} 
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })} 
                  className="input py-3 bg-slate-50 font-bold text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
                <select 
                  value={ticket.priority} 
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })} 
                  className="input py-3 bg-slate-50 font-bold text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Support</label>
                <select 
                  value={ticket.assigned_to || ''} 
                  onChange={(e) => handleUpdateTicket({ assigned_to: e.target.value || null })} 
                  className="input py-3 bg-slate-50 text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl font-medium"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">Categories</label>
                <div className="space-y-4">
                  {/* Category Combobox */}
                  <div className="space-y-1 relative">
                    <div className="input-group group" onClick={() => setCatDropdownOpen(!catDropdownOpen)}>
                      <input 
                        placeholder="Search or select Category"
                        value={catName} 
                        onChange={(e) => {
                          setCatName(e.target.value);
                          setCatDropdownOpen(true);
                        }}
                        onFocus={() => setCatDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            setCatDropdownOpen(false);
                          }, 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && catName.trim()) {
                            handleUpdateTicket({ category_name: catName });
                            setCatDropdownOpen(false);
                          }
                        }}
                        className="input py-2.5 bg-slate-50 text-slate-700 border-slate-100 focus:bg-white transition-colors rounded-lg text-sm w-full pr-10 cursor-pointer font-bold"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${catDropdownOpen ? 'rotate-180 text-primary-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {catDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setCatDropdownOpen(false); }}></div>
                        <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                          {categories.filter(c => c.name.toLowerCase().includes(catName.toLowerCase())).map(c => (
                            <div
                              key={c.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCatName(c.name);
                                setCatDropdownOpen(false);
                                handleUpdateTicket({ category_id: c.id });
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-slate-700 text-[13px] font-bold border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                            >
                              {c.name}
                            </div>
                          ))}
                          {categories.filter(c => c.name.toLowerCase().includes(catName.toLowerCase())).length === 0 && catName.trim() !== '' && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleUpdateTicket({ category_name: catName });
                                setCatDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-primary-50 text-primary-600 text-[13px] font-bold cursor-pointer transition-colors border-t border-slate-50 flex items-center gap-2 group"
                            >
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                              Add "{catName}"
                            </div>
                          )}
                          {categories.filter(c => c.name.toLowerCase().includes(catName.toLowerCase())).length === 0 && catName.trim() === '' && (
                            <div className="px-4 py-3 text-xs text-slate-400 italic">No categories found</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subcategory Combobox */}
                  <div className="space-y-1 relative">
                    <div className="input-group group" onClick={() => ticket.category_id && setSubCatDropdownOpen(!subCatDropdownOpen)}>
                      <input 
                        placeholder="Search or select Subcategory"
                        value={subCatName} 
                        onChange={(e) => {
                          setSubCatName(e.target.value);
                          setSubCatDropdownOpen(true);
                        }}
                        onFocus={() => setSubCatDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            setSubCatDropdownOpen(false);
                          }, 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && subCatName.trim()) {
                            handleUpdateTicket({ subcategory_name: subCatName });
                            setSubCatDropdownOpen(false);
                          }
                        }}
                        disabled={!ticket.category_id}
                        className="input py-2.5 bg-slate-50 text-slate-700 border-slate-100 focus:bg-white transition-colors rounded-lg text-sm w-full pr-10 cursor-pointer font-bold disabled:opacity-50"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${subCatDropdownOpen ? 'rotate-180 text-primary-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {subCatDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setSubCatDropdownOpen(false); }}></div>
                        <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                          {subcategories.filter(sc => sc.name.toLowerCase().includes(subCatName.toLowerCase())).map(sc => (
                            <div
                              key={sc.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSubCatName(sc.name);
                                setSubCatDropdownOpen(false);
                                handleUpdateTicket({ subcategory_id: sc.id });
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-slate-700 text-[13px] font-bold border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                            >
                              {sc.name}
                            </div>
                          ))}
                          {subCatName.trim() !== '' && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleUpdateTicket({ subcategory_name: subCatName });
                                setSubCatDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-primary-50 text-primary-600 text-[13px] font-bold cursor-pointer transition-colors border-t border-slate-50 flex items-center gap-2 group"
                            >
                              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                              Add "{subCatName}"
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requester Profile Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
             <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  Requester Profile
                </h2>
             </div>
             <div className="p-5">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
                    {ticket.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-lg truncate leading-none mb-1">{ticket.name}</p>
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                      <span className="text-xs font-bold tracking-wide">{ticket.department || 'General'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {ticket.anydesk_id && (
                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 animate-in slide-in-from-right-2 duration-300">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">AnyDesk ID</span>
                      </div>
                      <span className="font-black text-base">{ticket.anydesk_id}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-slate-400 font-medium italics uppercase text-[10px] tracking-widest">Ticket Created</span>
                    <span className="text-slate-700 font-bold">{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Linked Asset Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                Hardware Link
              </h2>
              {!showAssetSearch && (
                <button onClick={() => setShowAssetSearch(true)} className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                  {ticket.asset_id ? 'Change' : '+ Connect'}
                </button>
              )}
            </div>
            <div className="p-5">
              {ticket.asset_id && !showAssetSearch ? (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H7V9h2z"></path></svg>
                    </div>
                    <div className="min-w-0">
                      <Link to={`/assets/${ticket.asset_id}`} className="font-black text-emerald-900 text-base hover:underline truncate block">{ticket.asset_code}</Link>
                      <p className="text-xs font-bold text-emerald-600 truncate">{ticket.asset_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleUnlinkAsset} disabled={savingAsset} className="flex-1 py-2 text-xs font-bold text-rose-500 bg-white border border-rose-100 rounded-lg hover:bg-rose-50 transition active:scale-95">Disconnect Asset</button>
                    <Link to={`/assets/${ticket.asset_id}`} className="px-4 py-2 text-xs font-bold text-emerald-600 bg-white border border-emerald-100 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center">Details</Link>
                  </div>
                </div>
              ) : !showAssetSearch && (
                <button onClick={() => setShowAssetSearch(true)} className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all group">
                  <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-xs font-bold uppercase tracking-widest">Connect Hardware</span>
                </button>
              )}

              {showAssetSearch && (
                <div ref={assetSearchRef} className="animate-in slide-in-from-top-2 duration-300">
                  <div className="relative mb-3">
                    <input 
                      type="text" 
                      value={assetSearch} 
                      onChange={e => setAssetSearch(e.target.value)} 
                      placeholder="S/N, Tag, or Model..." 
                      className="input w-full py-3 pl-10 pr-4 text-sm bg-white border-slate-200 rounded-xl shadow-inner italic" 
                      autoFocus 
                      autoComplete="off" 
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    {assetSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>}
                  </div>
                  {assetDropdownOpen && assetResults.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto mb-3">
                      {assetResults.map(a => (
                        <button key={a.id} type="button" onClick={() => handleLinkAsset(a)} disabled={savingAsset} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left transition border-b border-slate-50 last:border-0 group">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.status === 'Available' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-blue-400'}`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-emerald-700">{a.asset_code}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{a.name} · {a.brand}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">Type at least 3 characters</p>
                    <button type="button" onClick={() => { setShowAssetSearch(false); setAssetSearch(''); setAssetResults([]); setAssetDropdownOpen(false); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <InternalNotes ticketId={ticket.ticket_id} />
        </div>
      </div>

       {/* Image Modal */}
       {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-8 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center">
             <button className="absolute -top-12 right-0 text-white hover:text-slate-300 transition transform hover:rotate-90">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
             <img src={selectedImage} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketDetail

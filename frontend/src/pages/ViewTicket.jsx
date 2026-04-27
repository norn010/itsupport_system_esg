import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import notificationSound from '../sound/notification_message-notification-alert-8-331718.m4a'
import { saveRecentTicket } from '../utils/ticketStorage'
import { getBrowserMetadata } from '../utils/browserInfo'

const ViewTicket = () => {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const senderNameRef = useRef('')

  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState('')
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    fetchTicket()
  }, [id])

  useEffect(() => {
    if (!ticket?.id) return

    socketRef.current = io()
    socketRef.current.emit('join_ticket', ticket.id)
    
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
      if (message.sender_type === 'staff') {
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.log('Audio error:', e));
      }
    })

    socketRef.current.on('ticket_updated', (updatedTicket) => {
      setTicket(prev => ({
        ...prev,
        ...updatedTicket,
        feedback_rating: prev.feedback_rating,
        feedback_comment: prev.feedback_comment
      }))
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/search/${id}`)
      setTicket(response.data)
      saveRecentTicket(response.data)
      setMessages(response.data.messages || [])
    } catch (err) {
      setError('Ticket not found')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const [isDragging, setIsDragging] = useState(false)

  const formatDate = (dateInput) => {
    if (!dateInput) return '-';
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
    
    // Support structured multi-line descriptions
    let lines = text.split('\n').filter(l => l.trim());
    
    // If we have metadata showing, hide redundant technical lines
    if (ticket?.metadata?.ticket_type && ticket.metadata.ticket_type !== 'general') {
       lines = lines.filter(line => {
         const labelsToHide = ['เบอร์โทรศัพท์', 'เวลาเริ่มต้น', 'เวลาสิ้นสุด', 'เริ่ม', 'สิ้นสุด', 'สาขา', 'จุดที่ติดตั้ง'];
         return !labelsToHide.some(label => line.startsWith(label + ':'));
       });
    }

    if (lines.length > 0) {
       return (
        <div className="grid grid-cols-1 gap-3 mt-2">
          {lines.map((line, i) => {
            if (line.includes(': ')) {
              const [label, ...valParts] = line.split(': ');
              const val = valParts.join(': ');
              // Skip if value is just '-' (empty note)
              if (val.trim() === '-' && lines.length > 1) return null;
              
              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[100px]">{label}</span>
                  <span className="text-sm font-bold text-gray-800">{val}</span>
                </div>
              );
            }
            return <div key={i} className="text-sm text-gray-700">{line}</div>;
          }).filter(l => l !== null)}
        </div>
      );
    }
    return null;
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile();
      if (file) {
        handleSelectedFile(file);
      }
    }
  }

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

  const handleSelectedFile = (file) => {
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewImage(null);
      }
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return
    setSending(true)

    // Stop typing immediately when sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socketRef.current.emit('stop_typing', { ticketId: ticket.id })

    const senderName = senderNameRef.current || 'User'
    
    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      formData.append('sender_type', 'user');
      formData.append('sender_name', senderName);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      
      const assetInfo = ticket.asset_id ? {
        name: ticket.asset_name,
        model: ticket.asset_model,
        asset_code: ticket.asset_code
      } : null;
      
      const metadata = getBrowserMetadata(assetInfo);
      formData.append('metadata', JSON.stringify(metadata));

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

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!feedbackRating) return alert('Please select a rating')
    setSubmittingFeedback(true)
    try {
      const { data } = await axios.post(`/api/tickets/${ticket.ticket_id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment
      })
      setTicket(prev => ({ 
        ...prev, 
        feedback_rating: data.feedback.rating, 
        feedback_comment: data.feedback.comment 
      }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6">
        <div className="card text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-red-600">{error}</h2>
          <p className="text-gray-600 mt-2">Please check the ticket ID and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      {/* Ticket Info */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.issue_title}</h1>
            <p className="text-gray-500">{ticket.ticket_id}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyLink}
                className={`p-2 rounded-xl transition-all border ${
                  copied 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-primary-500 hover:text-primary-600 shadow-sm'
                }`}
                title="Copy Link"
              >
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                )}
              </button>
              <button 
                onClick={() => setShowQR(true)}
                className="p-2 bg-white text-slate-500 border border-slate-200 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
                title="View QR Code"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {showQR && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowQR(false)}>
            <div className="bg-white p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900">Scan to follow status</h3>
              <div className="p-4 bg-white border-8 border-slate-50 rounded-2xl">
                <QRCodeSVG value={window.location.href} size={200} />
              </div>
              <p className="text-slate-500 text-sm font-medium">{ticket.ticket_id}</p>
              <button onClick={() => setShowQR(false)} className="mt-2 btn-secondary w-full py-3">Close</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 mb-8 mt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">From</span>
            </div>
            <p className="text-sm font-bold text-slate-800 break-words">{ticket.name}</p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Department</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{ticket.department || '-'}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Created</span>
            </div>
            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{formatDate(ticket.created_at)}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Assigned To</span>
            </div>
            <p className="text-sm font-bold text-indigo-600 truncate">{ticket.assigned_name || 'Waiting for IT'}</p>
          </div>

          {ticket.anydesk_id && (
            <div className="flex flex-col gap-1.5 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
              <div className="flex items-center gap-2 text-indigo-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">AnyDesk ID</span>
              </div>
              <p className="text-sm font-black text-indigo-600">{ticket.anydesk_id}</p>
            </div>
          )}
        </div>

        {/* Special Request Details for Voice/CCTV */}
        {ticket.metadata?.ticket_type && ticket.metadata.ticket_type !== 'general' && (
          <div className={`p-5 rounded-2xl mb-6 border ${
            ticket.metadata.ticket_type === 'voice_recording' ? 'bg-primary-50 border-primary-100' : 'bg-indigo-50 border-indigo-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{ticket.metadata.ticket_type === 'voice_recording' ? '🎙️' : '📸'}</span>
              <h3 className={`font-bold uppercase tracking-widest text-xs ${
                ticket.metadata.ticket_type === 'voice_recording' ? 'text-primary-700' : 'text-indigo-700'
              }`}>
                {ticket.metadata.ticket_type === 'voice_recording' ? 'Voice Recording Request' : 'CCTV Request Details'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ticket.metadata.special_fields?.phone && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Phone Number</p>
                  <p className="text-base font-black text-gray-900">{ticket.metadata.special_fields.phone}</p>
                </div>
              )}
              {ticket.metadata.special_fields?.location && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Location / Branch</p>
                  <p className="text-base font-black text-gray-900">{ticket.metadata.special_fields.location}</p>
                </div>
              )}
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Start Time</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(ticket.metadata.special_fields?.start_time)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">End Time</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(ticket.metadata.special_fields?.end_time)}</p>
              </div>
            </div>
          </div>
        )}

        {renderDescription(ticket.description) && (
          <div className="mb-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">More Details / Notes</p>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              {renderDescription(ticket.description)}
            </div>
          </div>
        )}

        {ticket.images?.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Attachments</p>
            <div className="grid grid-cols-4 gap-2">
              {ticket.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-bold mb-4">How was our service?</h3>
            {ticket.feedback_rating ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="font-semibold text-green-800 flex items-center gap-2">
                  <span className="text-xl">{'⭐'.repeat(ticket.feedback_rating)} </span>
                  Thank you for your feedback!
                </p>
                {ticket.feedback_comment && (
                  <p className="text-green-700 mt-2 text-sm italic">"{ticket.feedback_comment}"</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button" 
                      onClick={() => setFeedbackRating(star)}
                      className={`text-3xl hover:scale-110 transition ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea 
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any comments? (Optional)"
                  className="input w-full mb-3 text-sm h-20"
                />
                <button type="submit" disabled={submittingFeedback || !feedbackRating} className="btn-primary text-sm">
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <div 
        className={`card transition-all duration-300 ${isDragging ? 'ring-4 ring-primary-500 ring-opacity-50 border-primary-500 scale-[1.01]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2 className="text-xl font-bold mb-4">Chat with IT Support</h2>
        
        <div className={`bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto mb-4 relative ${isDragging ? 'bg-primary-50' : ''}`}>
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-primary-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-primary-500 rounded-lg animate-in fade-in zoom-in duration-200">
               <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
                 <div className="text-4xl">🖼️</div>
                 <p className="font-black text-primary-600 uppercase tracking-widest text-sm">Drop Image to Attach</p>
               </div>
            </div>
          )}
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_type === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-[10px] opacity-75 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></span>
                    {msg.sender_name} • {formatDate(msg.created_at)}
                  </p>
                  {msg.file_path && (
                    <div className="mb-2">
                       {msg.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                         <img 
                          src={msg.file_path} 
                          alt="Chat attachment" 
                          className="max-w-full rounded cursor-pointer hover:opacity-90 shadow-sm border border-black/5"
                          onClick={() => setSelectedImage(msg.file_path)}
                        />
                       ) : (
                        <a 
                          href={msg.file_path} 
                          download 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                            msg.sender_type === 'user'
                            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          <span className="truncate">{msg.file_path.split('/').pop()}</span>
                        </a>
                       )}
                    </div>
                  )}
                  {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                </div>
              </div>
            ))
          )}
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

        {selectedFile && (
          <div className="relative inline-block mb-4 p-2 bg-gray-50 border border-gray-100 rounded-xl shadow-sm">
            {selectedFile?.type.startsWith('image/') ? (
              <img src={previewImage} alt="Preview" className="h-20 w-20 object-cover rounded shadow-inner" />
            ) : (
              <div className="h-20 w-20 bg-gray-200 rounded flex flex-col items-center justify-center gap-1">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest px-1 truncate w-full text-center">{selectedFile?.name}</span>
              </div>
            )}
            <button
              onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition"
            >✕</button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Your name (optional)"
            className="input w-1/4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                document.getElementById('chat-message-input').focus()
              }
            }}
            onChange={(e) => senderNameRef.current = e.target.value}
          />
          <div className="flex-1 relative">
            <input
              id="chat-message-input"
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                
                // Typing Indicator logic
                if (socketRef.current) {
                  socketRef.current.emit('typing', { 
                    ticketId: ticket.id, 
                    userName: senderNameRef.current || 'User' 
                  })
                  
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                  typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current.emit('stop_typing', { ticketId: ticket.id })
                  }, 3000)
                }
              }}
              onPaste={handlePaste}
              placeholder="Type your message or paste an image..."
              className="input w-full pr-10"
              autoComplete="off"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
            >
              📎
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="*"
            onChange={(e) => handleSelectedFile(e.target.files[0])}
          />
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full size" className="max-w-[90%] max-h-[90%] rounded" />
        </div>
      )}
    </div>
  )
}

export default ViewTicket

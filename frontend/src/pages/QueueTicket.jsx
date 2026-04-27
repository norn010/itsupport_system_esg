import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

// ─── Helper: parse Firestore Timestamp OR ISO string → JS Date ───
const parseDate = (val) => {
  if (!val) return null
  if (typeof val === 'object') {
    if (val._seconds !== undefined) return new Date(val._seconds * 1000)
    if (val.seconds !== undefined) return new Date(val.seconds * 1000)
    if (typeof val.toDate === 'function') return val.toDate()
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const QueueTicket = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
    // Poll every 30 seconds for real-time-ish updates if socket isn't everywhere
    const interval = setInterval(fetchTickets, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await axios.get('/api/tickets?limit=200')
      setTickets(response.data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateInput) => {
    const date = parseDate(dateInput);
    if (!date) return '-';
    return date.toLocaleString('th-TH', {
      year: '2-digit', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getPriorityWeight = (p) => {
    if (p === 'High') return 3
    if (p === 'Medium') return 2
    return 1
  }

  const inProgressTickets = tickets
    .filter(t => {
      const s = t.status?.toLowerCase().replace(' ', '-')
      return s === 'in-progress' || s === 'in_progress'
    })
    .sort((a, b) => {
      const weightA = getPriorityWeight(a.priority)
      const weightB = getPriorityWeight(b.priority)
      if (weightA !== weightB) return weightB - weightA
      return parseDate(a.created_at) - parseDate(b.created_at)
    })

  const resolvedTickets = tickets
    .filter(t => t.status?.toLowerCase() === 'resolved')
    .sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at))

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

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 animate-in fade-in duration-500 space-y-8 md:space-y-12">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2 md:mb-4 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Hub
      </Link>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 hidden sm:block">
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Ticket Queue</h1>
            <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight">Real-time status of support requests</p>
          </div>
        </div>
        <div className="self-start md:self-center flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] md:text-xs border border-emerald-100/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE UPDATES
        </div>
      </div>

      {/* 1. In Progress Queue */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">In-Progress Tasks</h2>
          <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg text-xs font-black shadow-sm shadow-indigo-100">{inProgressTickets.length}</span>
        </div>

        {/* Mobile Cards (In Progress) */}
        <div className="md:hidden space-y-3">
          {inProgressTickets.length > 0 ? inProgressTickets.map(t => (
            <div key={t.id} className="card !p-4 border-l-4 border-indigo-500 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase tracking-wider flex items-center gap-1.5">
                    {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                    {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                    {t.ticket_id}
                  </span>
                </div>
                {getPriorityBadge(t.priority)}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 leading-snug">{t.issue_title}</h3>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-50">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">{t.name?.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{t.department}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase mt-2 pt-2 border-t border-slate-50">
                <div className="text-indigo-600 truncate max-w-[60%]">Assigned: {t.assigned_name || '—'}</div>
                <div className="text-slate-400 whitespace-nowrap">{formatDate(t.created_at)}</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">No tasks in progress.</div>
          )}
        </div>

        {/* Desktop Table (In Progress) */}
        <div className="hidden md:block card shadow-md border-indigo-100 overflow-hidden ring-1 ring-indigo-50 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ticket ID</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Requester</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inProgressTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg text-sm group-hover:bg-white border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5">
                        {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                        {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                        {t.ticket_id}
                      </span>
                    </td>
                    <td className="px-6 py-5 min-w-[200px]">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 hover:line-clamp-none transition-all cursor-default">
                        {t.issue_title}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
                          {t.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">{getPriorityBadge(t.priority)}</td>
                    <td className="px-6 py-5 text-sm font-bold text-indigo-600">{t.assigned_name || '-'}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-[10px] font-black text-slate-400 uppercase leading-tight min-w-[100px]">
                        {formatDate(t.created_at).split(' ').map((part, i) => (
                          <div key={i} className={i === 1 ? 'text-indigo-600 mt-0.5' : ''}>{part}</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Resolved Queue */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Resolved Tasks</h2>
          <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-lg text-xs font-black shadow-sm shadow-blue-100">{resolvedTickets.length}</span>
        </div>

        {/* Mobile Cards (Resolved) */}
        <div className="md:hidden space-y-3">
          {resolvedTickets.length > 0 ? resolvedTickets.map(t => (
            <div key={t.id} className="card !p-4 border-l-4 border-blue-500 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase tracking-wider flex items-center gap-1.5">
                    {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                    {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                    {t.ticket_id}
                  </span>
                </div>
                {getPriorityBadge(t.priority)}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 leading-snug">{t.issue_title}</h3>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">{t.name?.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{t.department}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase mt-2 pt-2 border-t border-slate-50">
                <div className="text-blue-600 truncate max-w-[60%]">Assigned: {t.assigned_name || '—'}</div>
                <div className="text-slate-400 whitespace-nowrap">{formatDate(t.created_at)}</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">No resolved tasks.</div>
          )}
        </div>

        {/* Desktop Table (Resolved) */}
        <div className="hidden md:block card shadow-md border-blue-100 overflow-hidden ring-1 ring-blue-50 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ticket ID</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Requester</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resolvedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg text-sm group-hover:bg-white border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5">
                        {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                        {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                        {t.ticket_id}
                      </span>
                    </td>
                    <td className="px-6 py-5 min-w-[200px]">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 hover:line-clamp-none transition-all cursor-default">
                        {t.issue_title}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
                          {t.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">{getPriorityBadge(t.priority)}</td>
                    <td className="px-6 py-5 text-sm font-bold text-blue-600">{t.assigned_name || '-'}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-[10px] font-black text-slate-400 uppercase leading-tight min-w-[100px]">
                        {formatDate(t.created_at).split(' ').map((part, i) => (
                          <div key={i} className={i === 1 ? 'text-blue-600 mt-0.5' : ''}>{part}</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. All Tickets List */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">All Requests</h2>
          <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-lg text-xs font-black border border-slate-200">{tickets.length}</span>
        </div>

        {/* Mobile Cards (All) */}
        <div className="md:hidden space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="card !p-4 bg-white/60 backdrop-blur-sm border-slate-200 border shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                    {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                    #{t.ticket_id}
                  </span>
                  {getStatusBadge(t.status)}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{formatDate(t.created_at)}</div>
              </div>
              <p className="text-sm font-bold text-slate-800 mb-2">{t.issue_title}</p>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">{t.name}</span>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t.department}</span>
                </div>
                {getPriorityBadge(t.priority)}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (All) */}
        <div className="hidden md:block card shadow-sm border-slate-200 overflow-hidden bg-white/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Ticket ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Reporter</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      {t.metadata?.ticket_type === 'voice_recording' && <span>🎙️</span>}
                      {t.metadata?.ticket_type === 'cctv' && <span>📸</span>}
                      {t.ticket_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-800 line-clamp-1 hover:line-clamp-none transition-all cursor-default">
                        {t.issue_title}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getPriorityBadge(t.priority)}</td>
                    <td className="px-4 py-4">{getStatusBadge(t.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{t.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight flex flex-col gap-0.5">
                        {formatDate(t.created_at).split(' ').map((p, i) => <div key={i}>{p}</div>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QueueTicket

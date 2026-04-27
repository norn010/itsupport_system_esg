import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'

// ─── Helper: parse Firestore Timestamp OR ISO string → JS Date ───
const parseDate = (val) => {
  if (!val) return null
  // 1. Firestore Timestamp object (both versions)
  if (typeof val === 'object') {
    if (val._seconds !== undefined) return new Date(val._seconds * 1000)
    if (val.seconds !== undefined) return new Date(val.seconds * 1000)
    // Sometimes it's nested or has toDate method (if not JSONified yet)
    if (typeof val.toDate === 'function') return val.toDate()
  }
  // 2. String or Number
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const fmtDate = (val) => {
  const d = parseDate(val)
  if (!d) return 'Invalid Date'
  return d.toLocaleDateString('th-TH')
}

const fmtDateTime = (val) => {
  const d = parseDate(val)
  if (!d) return '?'
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_STYLES = {
  OPEN:        'bg-emerald-100 text-emerald-700 border-emerald-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
  RESOLVED:    'bg-blue-100 text-blue-700 border-blue-200',
  CLOSED:      'bg-purple-100 text-purple-700 border-purple-200',
}

const getStatusStyle = (status) => {
  const s = status?.toUpperCase().replace(' ', '_') || 'OPEN'
  return STATUS_STYLES[s] || STATUS_STYLES.OPEN
}

const TYPE_BADGE = {
  voice_recording: (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
      บันทึกเสียง
    </span>
  ),
  cctv: (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      กล้องวงจรปิด
    </span>
  ),
}

// Custom label on top of bar
const BarLabel = ({ x, y, width, value }) => {
  if (!value) return null
  return (
    <text x={x + width / 2} y={y - 4} fill="#64748b" fontSize={11} textAnchor="middle" fontWeight="700">
      {value}
    </text>
  )
}

// Build chart data: grouped by branch, current year vs last year
function buildChartData(tickets, type) {
  const thisYear = new Date().getFullYear()
  const lastYear = thisYear - 1
  const byBranch = {}

  tickets
    .filter(t => {
      const meta = t.metadata || {}
      const ticketType = meta.ticket_type ||
        (t.issue_title?.startsWith('ขอไฟล์บันทึกเสียง') ? 'voice_recording' :
         t.issue_title?.startsWith('ขอไฟล์กล้องวงจรปิด') ? 'cctv' : null)
      return ticketType === type
    })
    .forEach(t => {
      const branch = t.department || 'ไม่ระบุสาขา'
      const d = parseDate(t.created_at)
      const year = d ? d.getFullYear() : null
      
      if (!byBranch[branch]) {
        byBranch[branch] = { branch, currentYear: 0, lastYear: 0 }
      }
      
      if (year === thisYear) {
        byBranch[branch].currentYear++
      } else if (year === lastYear) {
        byBranch[branch].lastYear++
      }
    })

  return Object.values(byBranch).sort((a, b) =>
    (b.currentYear + b.lastYear) - (a.currentYear + a.lastYear)
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3 text-sm">
        <p className="font-black text-slate-800 mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold">
            {p.name}: {p.value} Ticket
          </p>
        ))}
      </div>
    )
  }
  return null
}

const ITsTicketDashboard = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => { fetchTickets() }, [])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/tickets')
      const its = data.filter(t => {
        const meta = t.metadata || {}
        const source = meta.source || ''
        const type = meta.ticket_type || ''
        const title = t.issue_title || ''
        return (
          source === "IT's Ticket" ||
          type === 'voice_recording' ||
          type === 'cctv' ||
          title.startsWith('ขอไฟล์บันทึกเสียง') ||
          title.startsWith('ขอไฟล์กล้องวงจรปิด')
        )
      })
      setTickets(its)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const voiceData = buildChartData(tickets, 'voice_recording')
  const cctvData  = buildChartData(tickets, 'cctv')

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.issue_title?.toLowerCase().includes(search.toLowerCase()) ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter
    const type = t.metadata?.ticket_type ||
      (t.issue_title?.startsWith('ขอไฟล์บันทึกเสียง') ? 'voice_recording' :
       t.issue_title?.startsWith('ขอไฟล์กล้องวงจรปิด') ? 'cctv' : 'other')
    const matchType = typeFilter === 'ALL' || type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const counts = {
    total:       tickets.length,
    open:        tickets.filter(t => t.status?.toUpperCase() === 'OPEN').length,
    in_progress: tickets.filter(t => t.status?.toUpperCase().replace(' ', '_') === 'IN_PROGRESS').length,
    resolved:    tickets.filter(t => t.status?.toUpperCase() === 'RESOLVED').length,
    closed:      tickets.filter(t => t.status?.toUpperCase() === 'CLOSED').length,
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"/></svg>
            </div>
            IT's Ticket Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">ติดตาม Ticket บันทึกเสียง / กล้องวงจรปิด จากสาขา</p>
        </div>
        <button onClick={fetchTickets} className="btn-secondary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'ทั้งหมด',     value: counts.total,       color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200' },
          { label: 'OPEN',        value: counts.open,        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'IN PROGRESS', value: counts.in_progress, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'RESOLVED',    value: counts.resolved,    color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
          { label: 'CLOSED',      value: counts.closed,      color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* บันทึกเสียง chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Dashboard การขอไฟล์เสียง</h2>
              <p className="text-xs text-slate-400">จำแนกตามสาขา เทียบรายปี</p>
            </div>
          </div>

          {voiceData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                <p className="text-sm font-bold">ยังไม่มีข้อมูล</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={voiceData} margin={{ top: 18, right: 10, left: -20, bottom: 5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', paddingTop: '8px' }}
                  formatter={(v) => <span style={{ color: '#64748b' }}>{v === 'currentYear' ? 'ปีปัจจุบัน' : 'ปีที่แล้ว'}</span>} />
                <Bar name="ปีปัจจุบัน" dataKey="currentYear" fill="#1e3a5f" radius={[6,6,0,0]} maxBarSize={36} label={<BarLabel />} />
                <Bar name="ปีที่แล้ว" dataKey="lastYear" fill="#16a34a" radius={[6,6,0,0]} maxBarSize={36} label={<BarLabel />} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* กล้องวงจรปิด chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Dashboard การขอไฟล์กล้องวงจรปิด</h2>
              <p className="text-xs text-slate-400">จำแนกตามสาขา เทียบรายปี</p>
            </div>
          </div>

          {cctvData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <p className="text-sm font-bold">ยังไม่มีข้อมูล</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cctvData} margin={{ top: 18, right: 10, left: -20, bottom: 5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', paddingTop: '8px' }}
                  formatter={(v) => <span style={{ color: '#64748b' }}>{v === 'currentYear' ? 'ปีปัจจุบัน' : 'ปีที่แล้ว'}</span>} />
                <Bar name="ปีปัจจุบัน" dataKey="currentYear" fill="#1e3a5f" radius={[6,6,0,0]} maxBarSize={36} label={<BarLabel />} />
                <Bar name="ปีที่แล้ว" dataKey="lastYear" fill="#16a34a" radius={[6,6,0,0]} maxBarSize={36} label={<BarLabel />} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหา Ticket ID, ชื่อ, สาขา..."
          className="input flex-1 min-w-[200px] text-sm"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm">
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto text-sm">
          <option value="ALL">ประเภททั้งหมด</option>
          <option value="voice_recording">บันทึกเสียง</option>
          <option value="cctv">กล้องวงจรปิด</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <p className="font-bold text-slate-300">ไม่พบ Ticket</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Ticket ID</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">ประเภท</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">ผู้แจ้ง / สาขา</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">รายละเอียด</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">สถานะ</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">วันที่</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => {
                  const meta = t.metadata || {}
                  const type = meta.ticket_type ||
                    (t.issue_title?.startsWith('ขอไฟล์บันทึกเสียง') ? 'voice_recording' :
                     t.issue_title?.startsWith('ขอไฟล์กล้องวงจรปิด') ? 'cctv' : 'other')
                  const special = meta.special_fields || {}
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-purple-600">{t.ticket_id}</span>
                      </td>
                      <td className="px-5 py-4">
                        {TYPE_BADGE[type] || <span className="text-xs text-slate-400">-</span>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.department || '-'}</p>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-sm text-slate-700 font-medium truncate">{t.issue_title}</p>
                        {type === 'voice_recording' && special.phone && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            {special.phone}
                          </p>
                        )}
                        {(special.start_time || special.end_time) && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {fmtDateTime(special.start_time)}{' → '}{fmtDateTime(special.end_time)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${getStatusStyle(t.status)}`}>
                          {t.status?.replace('_', ' ') || 'OPEN'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">{fmtDate(t.created_at)}</td>
                      <td className="px-5 py-4">
                        <Link to={`/admin/ticket/${t.id}`} className="text-xs font-black text-purple-600 hover:text-purple-800 transition whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ITsTicketDashboard

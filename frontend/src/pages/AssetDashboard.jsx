import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const STATUS_PALETTE = {
  'Available': 'rgba(16,185,129,0.7)',
  'In Use': 'rgba(59,130,246,0.7)',
  'Repair': 'rgba(245,158,11,0.7)',
  'Lost': 'rgba(239,68,68,0.7)',
  'Retired': 'rgba(100,116,139,0.7)',
}

const CHART_COLORS = [
  'rgba(99,102,241,0.7)', 'rgba(236,72,153,0.7)', 'rgba(16,185,129,0.7)',
  'rgba(245,158,11,0.7)', 'rgba(59,130,246,0.7)', 'rgba(168,85,247,0.7)',
  'rgba(239,68,68,0.7)', 'rgba(20,184,166,0.7)', 'rgba(249,115,22,0.7)',
]

const AssetDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [expiringLicenses, setExpiringLicenses] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, licRes, invRes] = await Promise.all([
          axios.get('/api/assets/stats/dashboard'),
          axios.get('/api/licenses/expiring'),
          axios.get('/api/inventory/low-stock')
        ])
        setStats(statsRes.data)
        setExpiringLicenses(licRes.data)
        setLowStock(invRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  const byStatusData = {
    labels: stats?.byStatus?.map(s => s.status) || [],
    datasets: [{
      data: stats?.byStatus?.map(s => s.count) || [],
      backgroundColor: stats?.byStatus?.map(s => STATUS_PALETTE[s.status] || 'rgba(100,116,139,0.7)') || [],
      borderWidth: 0,
    }]
  }

  const byCategoryData = {
    labels: stats?.byCategory?.map(c => c.name) || [],
    datasets: [{
      data: stats?.byCategory?.map(c => c.count) || [],
      backgroundColor: CHART_COLORS.slice(0, stats?.byCategory?.length || 0),
      borderWidth: 0,
    }]
  }

  const byLocationData = {
    labels: stats?.byLocation?.map(l => l.name) || [],
    datasets: [{
      label: 'Assets',
      data: stats?.byLocation?.map(l => l.count) || [],
      backgroundColor: 'rgba(99,102,241,0.6)',
      borderColor: 'rgba(99,102,241,1)',
      borderWidth: 1,
      borderRadius: 8,
    }]
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Asset Dashboard
          </h1>
          <p className="text-slate-500 mt-1">IT Asset Management overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/assets" className="btn-secondary text-sm">View All Assets</Link>
          <Link to="/licenses" className="btn-secondary text-sm">Licenses</Link>
          <Link to="/inventory" className="btn-secondary text-sm">Inventory</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center !p-5">
          <p className="text-4xl font-bold bg-gradient-to-br from-primary-600 to-indigo-600 bg-clip-text text-transparent">{stats?.total || 0}</p>
          <p className="text-sm text-slate-500 mt-1">Total Assets</p>
        </div>
        {stats?.byStatus?.slice(0, 3).map(s => (
          <div key={s.status} className="card text-center !p-5">
            <p className="text-4xl font-bold" style={{ color: STATUS_PALETTE[s.status]?.replace('0.7', '1') }}>{s.count}</p>
            <p className="text-sm text-slate-500 mt-1">{s.status}</p>
          </div>
        ))}
      </div>

      {/* Maintenance Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card !p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-700">
                ฿{Number(stats?.maintenanceCost?.total_cost || 0).toLocaleString()}
              </p>
              <p className="text-sm text-amber-600 font-medium">Total Maintenance Cost</p>
              <p className="text-xs text-amber-500">{stats?.maintenanceCost?.total_records || 0} maintenance records</p>
            </div>
          </div>
        </div>
        <div className="card !p-5 bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">{stats?.warrantyExpiring?.length || 0}</p>
              <p className="text-sm text-red-600 font-medium">Warranty Expiring (30 days)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4 w-full text-left text-slate-800">Assets by Status</h2>
          <div className="w-48">
            <Doughnut data={byStatusData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
          </div>
        </div>
        <div className="card flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4 w-full text-left text-slate-800">Assets by Category</h2>
          <div className="w-48">
            <Pie data={byCategoryData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-bold mb-4 text-slate-800">Assets by Location</h2>
          <Bar data={byLocationData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Warranty Expiring */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50">
            <h2 className="font-bold text-slate-800">⚠ Warranty Expiring Soon</h2>
          </div>
          {stats?.warrantyExpiring?.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No assets with expiring warranty</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats?.warrantyExpiring?.map(a => (
                <Link key={a.id} to={`/assets/${a.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                  <div>
                    <span className="font-mono text-primary-600 text-sm font-semibold mr-2">{a.asset_code}</span>
                    <span className="text-sm text-slate-700">{a.name}</span>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">{new Date(a.warranty_expiry).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Problematic Assets */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-red-50/50">
            <h2 className="font-bold text-slate-800">🔧 Top Problematic Assets</h2>
          </div>
          {stats?.topProblematic?.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No maintenance records yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats?.topProblematic?.map(a => (
                <div key={a.asset_code} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                  <div>
                    <span className="font-mono text-primary-600 text-sm font-semibold mr-2">{a.asset_code}</span>
                    <span className="text-sm text-slate-700">{a.name}</span>
                  </div>
                  <span className="badge bg-red-500/10 text-red-700 border-red-200">{a.issue_count} issues</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expiring Licenses */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-purple-50/50">
            <h2 className="font-bold text-slate-800">📋 Licenses Expiring (30 days)</h2>
          </div>
          {expiringLicenses.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">No licenses expiring soon</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {expiringLicenses.map(l => (
                <div key={l.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">{l.name}</span>
                  <span className="text-xs text-purple-600 font-medium">{new Date(l.expiry_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-orange-50/50">
            <h2 className="font-bold text-slate-800">📦 Low Stock Items</h2>
          </div>
          {lowStock.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">All inventory levels are OK</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {lowStock.map(i => (
                <div key={i.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                  <div>
                    <span className="text-sm text-slate-700">{i.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{i.location_name || ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${i.quantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{i.quantity}</span>
                    <span className="text-xs text-slate-400">/ {i.reorder_level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssetDashboard

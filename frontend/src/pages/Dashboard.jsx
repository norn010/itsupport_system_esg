import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/tickets/stats/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const overview = stats?.overview || {}


  const formatDateSafe = (dateInput) => {
    const d = parseDate(dateInput);
    return d ? d.toLocaleDateString('th-TH') : '-';
  };

  const dailyChartData = {
    labels: stats?.daily?.map(d => formatDateSafe(d.date)) || [],
    datasets: [
      {
        label: 'Tickets per Day',
        data: stats?.daily?.map(d => d.count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  const staffChartData = {
    labels: stats?.byStaff?.map(s => s.full_name || 'Unassigned') || [],
    datasets: [
      {
        label: 'Tickets Assigned',
        data: stats?.byStaff?.map(s => s.ticket_count) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  }

  const categoryChartData = {
    labels: stats?.byCategory?.map(c => c.name || 'Uncategorized') || [],
    datasets: [
      {
        data: stats?.byCategory?.map(c => c.value) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const deptChartData = {
    labels: stats?.byDepartment?.map(d => d.name) || [],
    datasets: [
      {
        label: 'จำนวน Ticket',
        data: stats?.byDepartment?.map(d => d.value) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const deptChartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.x} tickets`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
      },
    },
  }


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <span className="text-slate-500 dark:text-slate-400">Welcome, {user?.full_name}</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="card text-center p-4">
          <p className="text-3xl font-bold text-primary-600">{overview.total || 0}</p>
          <p className="text-gray-500 text-sm">Total Tickets</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-3xl font-bold text-green-600">{overview.open || 0}</p>
          <p className="text-gray-500 text-sm">Open</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-3xl font-bold text-yellow-500">{overview.in_progress || 0}</p>
          <p className="text-gray-500 text-sm">In Progress</p>
        </div>
        <div className="card text-center p-4">
          <p className="text-3xl font-bold text-blue-600">{overview.resolved || 0}</p>
          <p className="text-gray-500 text-sm">Resolved</p>
        </div>
      </div>



      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Tickets per Day (Last 30 Days)</h2>
          <Bar data={dailyChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Tickets per Staff</h2>
          <Bar data={staffChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        
        <div className="card flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4 w-full text-left text-slate-800 dark:text-slate-200">Tickets by Category</h2>
          <div className="w-1/2">
            <Pie data={categoryChartData} options={{ responsive: true }} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Tickets by Branch</h2>
          {stats?.byDepartment?.length > 0 ? (
            <Bar data={deptChartData} options={deptChartOptions} />
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">ไม่มีข้อมูล</p>
          )}
        </div>

      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link to="/tickets" className="btn-primary">View All Tickets</Link>
          <Link to="/create" className="btn-secondary">Create New Ticket</Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

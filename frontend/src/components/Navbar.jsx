import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { io } from 'socket.io-client'

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

const fmtDateTime = (val) => {
  const d = parseDate(val)
  if (!d) return '?'
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

const Navbar = () => {
  const { user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAssetMenu, setShowAssetMenu] = useState(false)
  const [showITsMenu, setShowITsMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const dropdownRef = useRef(null)
  const assetMenuRef = useRef(null)
  const iTsMenuRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const socketRef = useRef(null)

  // Role IT's only sees IT's Ticket and IT's Rack's photo
  const isITs = user?.role === "IT's"

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    socketRef.current = io()
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected, registering user:', user.id)
      socketRef.current.emit('register_user', user.id)
    })

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socketRef.current.on('notification', (newNotif) => {
      console.log('New notification received:', newNotif)
      setNotifications(prev => [newNotif, ...prev])
    })

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (assetMenuRef.current && !assetMenuRef.current.contains(e.target)) {
        setShowAssetMenu(false)
      }
      if (iTsMenuRef.current && !iTsMenuRef.current.contains(e.target)) {
        setShowITsMenu(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setShowMobileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      socketRef.current?.disconnect()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications')
      setNotifications(res.data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleMarkAsRead = async (id, ticketId) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      if (ticketId) navigate(`/admin/ticket/${ticketId}`)
      setShowDropdown(false)
      setShowMobileMenu(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = () => {
    logout()
    setShowMobileMenu(false)
    navigate('/login')
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <nav className="bg-white/70 backdrop-blur-md shadow-[0_4px_30px_rgb(0,0,0,0.03)] border-b border-white sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-600 mr-2 lg:mr-8 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs">IT</div>
              <span className="hidden xs:inline">Support</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-1">
            {user ? (
              <>
                {isITs ? (
                  /* IT's role — only 2 menu items */
                  <>
                    <Link to="/its/ticket" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      </svg>
                      IT's Ticket
                    </Link>
                    <Link to="/its/rack-photo" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      IT's Rack's Photo
                    </Link>
                  </>
                ) : (
                  /* Normal IT / MANAGER role — full menu */
                  <>
                    <Link to="/knowledge-base" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Knowledge Base</Link>
                    <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Dashboard</Link>
                    <Link to="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Tickets</Link>
                    
                    {/* Assets Dropdown */}
                    <div className="relative" ref={assetMenuRef}>
                      <button onClick={() => setShowAssetMenu(!showAssetMenu)}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-1">
                        Assets
                        <svg className={`w-3 h-3 transition-transform ${showAssetMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showAssetMenu && (
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1">
                          <Link to="/assets/dashboard" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>Asset Dashboard</Link>
                          <Link to="/assets" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>All Assets</Link>
                          <Link to="/printers/dashboard" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>Printer Dashboard</Link>
                          <Link to="/printers" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>Printer List</Link>
                          <Link to="/printer-logs" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Printer Logs</Link>
                          <Link to="/licenses" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>Licenses</Link>
                          {/* <Link to="/inventory" onClick={() => setShowAssetMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>Inventory</Link> */}
                        </div>
                      )}
                    </div>

                    <Link to="/admin/kb" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Articles</Link>

                    {/* IT's Dropdown */}
                    <div className="relative" ref={iTsMenuRef}>
                      <button onClick={() => setShowITsMenu(!showITsMenu)}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-1">
                        IT's
                        <svg className={`w-3 h-3 transition-transform ${showITsMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showITsMenu && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1">
                          <div className="px-4 py-2 border-b border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard</p>
                          </div>
                          <Link to="/its/ticket-dashboard" onClick={() => setShowITsMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"/></svg>
                            IT's Ticket Dashboard
                          </Link>
                          <Link to="/its/rack-dashboard" onClick={() => setShowITsMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            IT's Rack Dashboard
                          </Link>
                        </div>
                      )}
                    </div>

                    <Link to="/admin/users" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Staff User</Link>
                  </>
                )}
              </>
            ) : (
              <Link to="/knowledge-base" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-slate-50 transition">Knowledge Base</Link>
            )}
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-2 lg:gap-4">
                {/* User Info (Desktop only) */}
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</span>
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px] dark:text-slate-200">{user.full_name || user.username}</span>
                </div>

                {/* Dark Mode Toggle */}
                <button 
                  onClick={toggleDarkMode} 
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? (
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0A9 9 0 115.636 5.636m12.728 12.728L12 12"></path></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                  )}
                </button>

                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowDropdown(!showDropdown)} className="relative p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-full transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between items-center p-4 border-b border-slate-50 bg-slate-50/50">
                        <span className="font-bold text-slate-800">Notifications</span>
                        <button onClick={handleMarkAllAsRead} className="text-xs font-semibold text-primary-600 hover:text-primary-800">Mark all as read</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-sm text-slate-400 italic">No notifications yet.</div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} onClick={() => handleMarkAsRead(notif.id, notif.related_ticket_id)}
                              className={`p-4 border-b border-slate-50 cursor-pointer transition flex gap-3 ${notif.is_read ? 'bg-white opacity-60' : 'bg-primary-50/30 hover:bg-primary-50/50'}`}>
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.is_read ? 'bg-slate-200' : 'bg-primary-500'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm mb-0.5 leading-snug ${notif.is_read ? 'text-slate-600' : 'font-bold text-slate-800'}`}>{notif.title}</p>
                                <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1.5 block">{fmtDateTime(notif.created_at)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout Button (Desktop only) */}
                <button onClick={handleLogout} className="hidden lg:block btn-secondary !py-1.5 !px-3 text-sm">Logout</button>

                {/* Hamburger (Mobile only) */}
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="lg:hidden p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showMobileMenu ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1">
                  Login <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </Link>
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="lg:hidden p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowMobileMenu(false)}
          ></div>
          
          {/* Drawer Content */}
          <div 
            ref={mobileMenuRef} 
            className="relative w-[280px] h-screen bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <span className="font-black text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs">IT</div>
                Menu
              </span>
              <button 
                onClick={() => setShowMobileMenu(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Theme Mode</span>
               <button 
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${darkMode ? 'bg-primary-600' : 'bg-slate-200'}`}
               >
                 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
            </div>
            
            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {user ? (
                <>
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Authenticated as</p>
                    <p className="font-bold text-slate-900 truncate">{user.full_name || user.username}</p>
                    <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${
                      isITs ? 'bg-purple-100 text-purple-700 ring-purple-200' : 'bg-primary-100 text-primary-700 ring-primary-200'
                    }`}>
                      {user.role}
                    </div>
                  </div>

                  {isITs ? (
                    /* IT's role — only IT's menu items */
                    <>
                      <Link to="/its/ticket" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"></path></svg>
                        IT's Ticket
                      </Link>
                      <Link to="/its/rack-photo" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        IT's Rack's Photo
                      </Link>
                    </>
                  ) : (
                    /* Full menu */
                    <>
                      <Link to="/knowledge-base" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        Knowledge Base
                      </Link>
                      <Link to="/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        Dashboard
                      </Link>
                      <Link to="/tickets" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"></path></svg>
                        All Tickets
                      </Link>

                      <div className="h-px bg-slate-100 my-4 mx-4"></div>
                      <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Assets &amp; ITAM</p>
                      
                      <Link to="/assets/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        Asset Dashboard
                      </Link>
                      <Link to="/assets" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        Hardware Registry
                      </Link>
                      <Link to="/printers/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
                        Printer Dashboard
                      </Link>
                      <Link to="/printers" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Printer List
                      </Link>
                      <Link to="/printer-logs" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Printer Logs
                      </Link>
                      <Link to="/licenses" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                        Software Licenses
                      </Link>

                      <div className="h-px bg-slate-100 my-4 mx-4"></div>
                      <Link to="/admin/kb" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Article Manager
                      </Link>
                      <Link to="/admin/users" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        Manage Staff
                      </Link>

                      <div className="h-px bg-slate-100 my-4 mx-4"></div>
                      <p className="px-4 text-[10px] font-bold text-purple-500 uppercase tracking-[0.2em] mb-2">IT's</p>
                      <Link to="/its/ticket-dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"></path></svg>
                        IT's Ticket Dashboard
                      </Link>
                      <Link to="/its/rack-dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 text-slate-700 font-bold transition-all">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        IT's Rack Dashboard
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <Link to="/knowledge-base" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition-all">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  Knowledge Base
                </Link>
              )}
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {user ? (
                <button 
                  onClick={handleLogout} 
                  className="w-full btn-danger !rounded-xl flex items-center justify-center gap-2 py-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Sign Out
                </button>
              ) : (
                <Link 
                  to="/login" 
                  onClick={() => setShowMobileMenu(false)} 
                  className="w-full btn-primary !rounded-xl flex items-center justify-center gap-2 py-3"
                >
                  Staff Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar

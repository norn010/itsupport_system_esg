import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Navbar from './components/Navbar'
import CreateTicket from './pages/CreateTicket'
import ViewTicket from './pages/ViewTicket'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/TicketList'
import TicketDetail from './pages/TicketDetail'
import KnowledgeBase from './pages/KnowledgeBase'
import ManageArticles from './pages/ManageArticles'
import AssetList from './pages/AssetList'
import AssetDetail from './pages/AssetDetail'
import AssetDashboard from './pages/AssetDashboard'
import LicenseList from './pages/LicenseList'
import InventoryList from './pages/InventoryList'
import Home from './pages/Home'
import QueueTicket from './pages/QueueTicket'
import ManageUsers from './pages/ManageUsers'

function App() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateTicket />} />
        <Route path="/queue" element={<QueueTicket />} />
        <Route path="/ticket/:id" element={<ViewTicket />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/knowledge-base/:slug" element={<KnowledgeBase />} />
        
        {/* Admin Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <Layout requireAuth>
            <Dashboard />
          </Layout>
        } />
        <Route path="/tickets" element={
          <Layout requireAuth>
            <TicketList />
          </Layout>
        } />
        <Route path="/admin/ticket/:id" element={
          <Layout requireAuth>
            <TicketDetail />
          </Layout>
        } />
        <Route path="/admin/kb" element={
          <Layout requireAuth>
            <ManageArticles />
          </Layout>
        } />
        <Route path="/admin/users" element={
          <Layout requireAuth>
            <ManageUsers />
          </Layout>
        } />

        {/* ITAM Routes */}
        <Route path="/assets" element={
          <Layout requireAuth>
            <AssetList />
          </Layout>
        } />
        <Route path="/assets/dashboard" element={
          <Layout requireAuth>
            <AssetDashboard />
          </Layout>
        } />
        <Route path="/assets/:id" element={
          <Layout requireAuth>
            <AssetDetail />
          </Layout>
        } />
        <Route path="/licenses" element={
          <Layout requireAuth>
            <LicenseList />
          </Layout>
        } />
        <Route path="/inventory" element={
          <Layout requireAuth>
            <InventoryList />
          </Layout>
        } />
      </Routes>
    </div>
  )
}

export default App

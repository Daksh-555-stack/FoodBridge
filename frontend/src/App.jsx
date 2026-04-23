import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { useWebSocket } from './hooks/useWebSocket'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'

// Role dashboards
import DonorDashboard from './pages/donor/DonorDashboard'
import ListFoodPage from './pages/donor/ListFoodPage'
import RegisterRestaurant from './pages/donor/RegisterRestaurant'

import ShelterDashboard from './pages/shelter/ShelterDashboard'
import RegisterShelter from './pages/shelter/RegisterShelter'

import DriverDashboard from './pages/driver/DriverDashboard'
import DriverOnboarding from './pages/driver/DriverOnboarding'
import NavigationMap from './pages/driver/NavigationMap'

import AdminDashboard from './pages/AdminDashboard'
import PendingApprovalPage from './pages/PendingApprovalPage'

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(window.atob(normalized))
  } catch {
    return null
  }
}

function ProtectedRoute({ children }) {
  const { state } = useApp()
  if (!state.user) return <Navigate to="/" replace />
  if (state.user.role !== 'admin' && state.user.is_approved === false) {
    return <Navigate to="/pending-approval" replace />
  }
  return children
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('fb_access_token')
  if (!token) return <Navigate to="/" replace />

  const payload = decodeToken(token)
  if (payload?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

function PendingRoute({ children }) {
  const token = localStorage.getItem('fb_access_token')
  if (!token) return <Navigate to="/" replace />
  return children
}

function authenticatedHome(user) {
  if (!user) return '/'
  if (user.role === 'admin') return '/admin'
  if (user.is_approved === false) return '/pending-approval'
  if (user.role === 'shelter') return '/shelter/dashboard'
  if (user.role === 'driver') return '/driver/dashboard'
  return '/dashboard'
}

function RoleDashboard() {
  const { state } = useApp()
  switch (state.user?.role) {
    case 'donor': return <DonorDashboard />
    case 'shelter': return <ShelterDashboard />
    case 'driver': return <DriverDashboard />
    case 'admin': return <AdminDashboard />
    default: return <DonorDashboard />
  }
}

function AppContent() {
  const { state } = useApp()
  const location = useLocation()
  useWebSocket()
  const hideGlobalNav = location.pathname === '/admin' || location.pathname === '/pending-approval'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {state.user && !hideGlobalNav && <Navbar />}
      <main className={state.user && !hideGlobalNav ? 'pt-16' : ''}>
        <Routes>
          {/* Landing page — unauthenticated home */}
          <Route path="/" element={
            state.user ? <Navigate to={authenticatedHome(state.user)} replace /> : <LandingPage />
          } />

          {/* Legacy /login → redirect to landing */}
          <Route path="/login" element={
            state.user ? <Navigate to={authenticatedHome(state.user)} replace /> : <LandingPage />
          } />

          {/* Universal dashboard — renders role-specific component */}
          <Route path="/dashboard" element={
            <ProtectedRoute><RoleDashboard /></ProtectedRoute>
          } />

          {/* Donor routes */}
          <Route path="/donor/list-food" element={
            <ProtectedRoute><ListFoodPage /></ProtectedRoute>
          } />
          <Route path="/donor/register-restaurant" element={
            <ProtectedRoute><RegisterRestaurant /></ProtectedRoute>
          } />

          {/* Shelter routes */}
          <Route path="/shelter/register" element={
            <ProtectedRoute><RegisterShelter /></ProtectedRoute>
          } />
          <Route path="/shelter/dashboard" element={
            <ProtectedRoute><ShelterDashboard /></ProtectedRoute>
          } />

          {/* Driver routes */}
          <Route path="/driver/register" element={
            <ProtectedRoute><DriverOnboarding /></ProtectedRoute>
          } />
          <Route path="/driver/dashboard" element={
            <ProtectedRoute><DriverDashboard /></ProtectedRoute>
          } />
          <Route path="/driver/navigate/:deliveryId" element={
            <ProtectedRoute><NavigationMap /></ProtectedRoute>
          } />

          <Route path="/admin" element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />

          <Route path="/pending-approval" element={
            <PendingRoute><PendingApprovalPage /></PendingRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={state.user ? authenticatedHome(state.user) : "/"} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AppContent />
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { useWebSocket } from './hooks/useWebSocket'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MapView from './pages/MapView'
import DonationNew from './pages/DonationNew'
import Donations from './pages/Donations'
import RoutesPage from './pages/RoutesPage'
import Shelters from './pages/Shelters'
import Admin from './pages/Admin'

function ProtectedRoute({ children }) {
  const { state } = useApp()
  if (!state.user) return <Navigate to="/login" replace />
  return children
}

function AppContent() {
  const { state } = useApp()
  useWebSocket()

  return (
    <div className="min-h-screen bg-gray-950">
      {state.user && <Navbar />}
      <main className={state.user ? 'pt-16' : ''}>
        <Routes>
          <Route path="/login" element={
            state.user ? <Navigate to="/dashboard" replace /> : <Login />
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute><MapView /></ProtectedRoute>
          } />
          <Route path="/donations/new" element={
            <ProtectedRoute><DonationNew /></ProtectedRoute>
          } />
          <Route path="/donations" element={
            <ProtectedRoute><Donations /></ProtectedRoute>
          } />
          <Route path="/routes" element={
            <ProtectedRoute><RoutesPage /></ProtectedRoute>
          } />
          <Route path="/shelters" element={
            <ProtectedRoute><Shelters /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute><Admin /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to={state.user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AppContent />
}

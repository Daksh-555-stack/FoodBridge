import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const roleNavItems = {
  donor: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/donor/list-food', label: 'List Food', icon: '🍲' },
    { path: '/donor/register-restaurant', label: 'Restaurant', icon: '🏪' },
  ],
  driver: [
    { path: '/dashboard', label: 'Dashboard', icon: '🚗' },
    { path: '/driver/register', label: 'Register', icon: '📋' },
  ],
  shelter: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/shelter/register', label: 'Register Shelter', icon: '🏠' },
  ],
  admin: [
    { path: '/dashboard', label: 'Admin Panel', icon: '⚙️' },
  ],
}

export default function Navbar() {
  const { state, dispatch } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = roleNavItems[state.user?.role] || []
  const isNavMap = location.pathname.startsWith('/driver/navigate')

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-gray-800/50 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', boxShadow: '0 0 16px rgba(220,38,38,0.5)' }}>
              F
            </div>
            {!isNavMap && (
              <span className="text-lg font-bold hidden sm:block" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FoodBridge AI
              </span>
            )}
          </Link>

          {/* Desktop Nav — hide on navigation map */}
          {!isNavMap && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}>
                  <span className="mr-1.5">{item.icon}</span>{item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Back button on nav map */}
            {isNavMap && (
              <Link to="/dashboard" className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700 transition-all">
                ← Dashboard
              </Link>
            )}

            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => {
                setShowNotifications(!showNotifications)
                if (!showNotifications) dispatch({ type: 'MARK_NOTIFICATIONS_READ' })
              }} className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {state.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                    {state.unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 glass-card rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-slide-in">
                  <div className="p-3 border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-200">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {state.notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">No notifications yet</p>
                    ) : (
                      state.notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`p-3 border-b border-gray-800/50 text-sm ${!n.read ? 'bg-gray-800/30' : ''}`}>
                          <span className="mr-2">
                            {n.type === 'new_listing' ? '🍲' : n.type === 'delivery_assigned' ? '🚗' :
                             n.type === 'food_delivered' ? '🎉' : n.type === 'food_picked_up' ? '📦' :
                             n.type === 'expiry_alert' ? '⏰' : '📋'}
                          </span>
                          <span className="text-gray-300">
                            {n.type === 'new_listing' && `New food: ${n.data?.food_name || 'Available'}`}
                            {n.type === 'new_claim' && 'New delivery job available'}
                            {n.type === 'delivery_assigned' && 'A driver is on the way!'}
                            {n.type === 'food_picked_up' && 'Driver picked up the food'}
                            {n.type === 'food_delivered' && 'Food delivered successfully!'}
                            {n.type === 'expiry_alert' && `${n.data?.food_name} expiring soon`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User badge */}
            {!isNavMap && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800/60 border border-gray-700">
                <span className="text-xs font-semibold text-gray-300 capitalize">{state.user?.role}</span>
              </div>
            )}

            {/* Logout */}
            <button onClick={handleLogout} className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-800/50 transition-all" title="Logout">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* Mobile Toggle */}
            {!isNavMap && (
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && !isNavMap && (
          <div className="md:hidden pb-4 border-t border-gray-800 mt-2 pt-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.path ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}>
                <span className="mr-2">{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

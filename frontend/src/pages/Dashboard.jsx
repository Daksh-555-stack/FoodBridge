import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import MatchCard from '../components/MatchCard'
import ExpiryCountdown from '../components/ExpiryCountdown'
import toast from 'react-hot-toast'

const statCards = {
  admin: [
    { key: 'total_food_rescued_kg', label: 'Food Rescued', unit: 'kg', icon: '🍲', color: 'from-emerald-500 to-green-600' },
    { key: 'active_donors', label: 'Active Donors', icon: '👥', color: 'from-teal-500 to-cyan-600' },
    { key: 'drivers_on_road', label: 'Drivers Active', icon: '🚗', color: 'from-blue-500 to-indigo-600' },
    { key: 'shelters_served', label: 'Shelters Served', icon: '🏠', color: 'from-rose-500 to-red-600' },
    { key: 'pending_donations', label: 'Pending', icon: '⏳', color: 'from-amber-500 to-orange-600' },
    { key: 'active_matches', label: 'Active Matches', icon: '🎯', color: 'from-purple-500 to-violet-600' },
  ],
  donor: [
    { key: 'total_donations', label: 'My Donations', icon: '🍲', color: 'from-emerald-500 to-green-600' },
    { key: 'pending', label: 'Pending', icon: '⏳', color: 'from-amber-500 to-orange-600' },
    { key: 'delivered', label: 'Delivered', icon: '✅', color: 'from-teal-500 to-cyan-600' },
  ],
  driver: [
    { key: 'active_routes', label: 'Active Routes', icon: '🛣️', color: 'from-blue-500 to-indigo-600' },
    { key: 'completed', label: 'Completed', icon: '✅', color: 'from-emerald-500 to-green-600' },
  ],
  shelter: [
    { key: 'incoming', label: 'Incoming', icon: '📦', color: 'from-rose-500 to-red-600' },
    { key: 'capacity_used', label: 'Capacity Used', icon: '📊', color: 'from-amber-500 to-orange-600' },
  ],
}

export default function Dashboard() {
  const { state, dispatch } = useApp()
  const role = state.user?.role

  // Fetch metrics (admin)
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/metrics')
      return data
    },
    enabled: role === 'admin',
    refetchInterval: 30000,
  })

  // Fetch donations
  const { data: donations = [] } = useQuery({
    queryKey: ['donations'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/donations')
        return data
      } catch { return [] }
    },
    refetchInterval: 15000,
  })

  // Fetch recent matches
  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/matches')
        return data
      } catch { return [] }
    },
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (donations.length) dispatch({ type: 'SET_DONATIONS', payload: donations })
  }, [donations])

  useEffect(() => {
    if (matches.length) dispatch({ type: 'SET_MATCHES', payload: matches })
  }, [matches])

  // Compute role-specific stats
  const getStatValue = (key) => {
    if (metrics && role === 'admin') return metrics[key] ?? 0
    if (role === 'donor') {
      const myDonations = donations.filter(d => d.donor_id === state.user?.id)
      if (key === 'total_donations') return myDonations.length
      if (key === 'pending') return myDonations.filter(d => d.status === 'pending').length
      if (key === 'delivered') return myDonations.filter(d => d.status === 'delivered').length
    }
    if (role === 'driver') {
      if (key === 'active_routes') return matches.filter(m => m.driver_id === state.user?.id).length
      if (key === 'completed') return donations.filter(d => d.status === 'delivered').length
    }
    if (role === 'shelter') {
      if (key === 'incoming') return matches.filter(m => m.shelter_id === state.user?.id).length
      if (key === 'capacity_used') return '—'
    }
    return 0
  }

  const cards = statCards[role] || statCards.admin

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{state.user?.name}</span>
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with food rescue today</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((card, i) => (
          <div key={card.key} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${card.color} text-white text-lg mb-3 shadow-lg`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-white">
              {getStatValue(card.key)}{card.unit ? <span className="text-sm text-gray-400 ml-1">{card.unit}</span> : ''}
            </div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Donations</h2>
            <Link to="/donations" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {(role === 'donor' ? donations.filter(d => d.donor_id === state.user?.id) : donations)
              .slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍲</span>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{d.food_type}</div>
                    <div className="text-xs text-gray-500">{d.quantity_kg}kg</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ExpiryCountdown expiryDatetime={d.expiry_datetime} />
                  <span className={`status-badge ${
                    d.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    d.status === 'matched' ? 'bg-blue-500/20 text-blue-400' :
                    d.status === 'in_transit' ? 'bg-purple-500/20 text-purple-400' :
                    d.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
            {donations.length === 0 && (
              <p className="text-center text-gray-500 py-8">No donations yet</p>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Latest Matches</h2>
          {matches.slice(0, 3).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
          {matches.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-gray-500">No matches yet. Create a donation to trigger AI matching!</p>
              {role === 'donor' && (
                <Link to="/donations/new" className="btn-primary inline-block mt-4">
                  Create Donation
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {role === 'donor' && (
        <div className="mt-8 flex gap-4">
          <Link to="/donations/new" className="btn-primary">
            + New Donation
          </Link>
          <Link to="/map" className="btn-secondary">
            View Live Map
          </Link>
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Admin() {
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => { const { data } = await api.get('/admin/metrics'); return data },
    refetchInterval: 10000,
  })

  const { data: donations = [] } = useQuery({
    queryKey: ['admin-donations'],
    queryFn: async () => { const { data } = await api.get('/donations'); return data },
    refetchInterval: 15000,
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: async () => { const { data } = await api.get('/matches'); return data },
    refetchInterval: 15000,
  })

  const triggerMatching = async () => {
    try {
      await api.post('/matches/trigger')
      toast.success('🎯 AI matching triggered for all pending donations!')
    } catch (err) {
      toast.error(err.response?.data?.detail?.error || 'Failed to trigger matching')
    }
  }

  const kpis = [
    { label: 'Food Rescued', value: `${metrics?.total_food_rescued_kg?.toFixed(1) || 0} kg`, icon: '🍲', color: 'from-emerald-500 to-green-600' },
    { label: 'Active Donors', value: metrics?.active_donors || 0, icon: '👥', color: 'from-teal-500 to-cyan-600' },
    { label: 'Drivers Active', value: metrics?.drivers_on_road || 0, icon: '🚗', color: 'from-blue-500 to-indigo-600' },
    { label: 'Shelters Served', value: metrics?.shelters_served || 0, icon: '🏠', color: 'from-rose-500 to-red-600' },
    { label: 'Pending', value: metrics?.pending_donations || 0, icon: '⏳', color: 'from-amber-500 to-orange-600' },
    { label: 'Active Matches', value: metrics?.active_matches || 0, icon: '🎯', color: 'from-purple-500 to-violet-600' },
  ]

  const statusBreakdown = {
    pending: donations.filter(d => d.status === 'pending').length,
    matched: donations.filter(d => d.status === 'matched').length,
    in_transit: donations.filter(d => d.status === 'in_transit').length,
    delivered: donations.filter(d => d.status === 'delivered').length,
    expired: donations.filter(d => d.status === 'expired').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">System overview and controls</p>
        </div>
        <button onClick={triggerMatching} className="btn-primary" id="trigger-matching-btn">
          🎯 Trigger AI Matching
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${kpi.color} text-lg mb-3 shadow-lg`}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="glass-card p-6 mb-8 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Donation Status Breakdown</h2>
        <div className="flex gap-2 h-8 rounded-xl overflow-hidden">
          {Object.entries(statusBreakdown).map(([status, count]) => {
            const total = donations.length || 1
            const pct = (count / total) * 100
            const colors = { pending: 'bg-amber-500', matched: 'bg-blue-500', in_transit: 'bg-purple-500', delivered: 'bg-emerald-500', expired: 'bg-red-500' }
            return pct > 0 ? (
              <div key={status} className={`${colors[status]} flex items-center justify-center text-xs font-bold text-white transition-all duration-500`}
                style={{ width: `${pct}%` }} title={`${status}: ${count}`}>
                {pct > 8 ? `${status} (${count})` : ''}
              </div>
            ) : null
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                status === 'pending' ? 'bg-amber-500' : status === 'matched' ? 'bg-blue-500' : status === 'in_transit' ? 'bg-purple-500' : status === 'delivered' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              {status}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Matches ({matches.length})</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {matches.slice(0, 10).map(m => (
              <div key={m.id} className="p-3 rounded-xl bg-gray-800/40 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Match #{m.id}</span>
                  <span className="text-emerald-400 font-semibold">{((m.confidence_score || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Donation #{m.donation_id} → Driver #{m.driver_id} → Shelter #{m.shelter_id}
                </div>
              </div>
            ))}
            {matches.length === 0 && <p className="text-gray-500 text-center py-4">No matches yet</p>}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
          <div className="space-y-3">
            {['Backend API', 'AI Engine', 'PostgreSQL', 'Redis', 'WebSocket'].map(service => (
              <div key={service} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40">
                <span className="text-sm text-gray-300">{service}</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

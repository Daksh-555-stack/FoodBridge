import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import ExpiryCountdown from '../components/ExpiryCountdown'

const statusConfig = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
  matched: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Matched' },
  in_transit: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'In Transit' },
  delivered: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Delivered' },
  expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Expired' },
}

export default function Donations() {
  const { state } = useApp()

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations-list'],
    queryFn: async () => {
      const { data } = await api.get('/donations')
      return data
    },
    refetchInterval: 15000,
  })

  const filtered = state.user?.role === 'donor'
    ? donations.filter(d => d.donor_id === state.user.id)
    : donations

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white">Donations</h1>
          <p className="text-gray-500 mt-1">{filtered.length} donation{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        {state.user?.role === 'donor' && (
          <Link to="/donations/new" className="btn-primary">
            + New Donation
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'matched', 'in_transit', 'delivered', 'expired'].map(s => (
          <span key={s} className={`status-badge cursor-pointer ${
            s === 'all' ? 'bg-gray-700/50 text-gray-300' : (statusConfig[s]?.bg + ' ' + statusConfig[s]?.text)
          }`}>
            {s === 'all' ? 'All' : statusConfig[s]?.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d, i) => {
            const sc = statusConfig[d.status] || statusConfig.pending
            return (
              <div key={d.id} className="glass-card p-5 animate-fade-in hover:border-gray-700 transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-2xl">
                      🍲
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{d.food_type}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{d.quantity_kg} kg</span>
                        <span>•</span>
                        <span>Donor #{d.donor_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <ExpiryCountdown expiryDatetime={d.expiry_datetime} />
                    <span className={`status-badge ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 glass-card">
              <p className="text-3xl mb-3">🍲</p>
              <p className="text-gray-400 text-lg">No donations yet</p>
              {state.user?.role === 'donor' && (
                <Link to="/donations/new" className="btn-primary inline-block mt-4">
                  Create Your First Donation
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

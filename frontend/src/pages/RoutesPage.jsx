import { useQuery } from '@tanstack/react-query'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import RouteTimeline from '../components/RouteTimeline'
import toast from 'react-hot-toast'

export default function RoutesPage() {
  const { state } = useApp()

  const { data: matches = [] } = useQuery({
    queryKey: ['driver-matches'],
    queryFn: async () => {
      const { data } = await api.get('/matches')
      return data
    },
    refetchInterval: 15000,
  })

  const myMatches = state.user?.role === 'driver'
    ? matches.filter(m => m.driver_id === state.user.id)
    : matches

  const handleComplete = async (routeId) => {
    try {
      await api.post(`/routes/${routeId}/complete`)
      toast.success('🎉 Delivery completed! Thank you for rescuing food!')
    } catch (err) {
      toast.error(err.response?.data?.detail?.error || 'Failed to complete delivery')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">
          {state.user?.role === 'driver' ? 'My Routes' : 'All Routes'}
        </h1>
        <p className="text-gray-500 mt-1">
          {myMatches.length} active route{myMatches.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-6">
        {myMatches.map((match, i) => (
          <div key={match.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="glass-card p-5 mb-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Match #{match.id} — {match.donation?.food_type || 'Food Delivery'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {match.donation?.quantity_kg || '?'} kg •
                    Confidence: {((match.confidence_score || 0) * 100).toFixed(0)}%
                  </p>
                </div>

                {state.user?.role === 'driver' && match.route && (
                  <button
                    id={`complete-route-${match.route?.id}`}
                    onClick={() => handleComplete(match.route?.id)}
                    className="btn-primary text-sm"
                  >
                    ✅ Mark Delivered
                  </button>
                )}
              </div>

              {/* Confidence Bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(match.confidence_score || 0) * 100}%` }}
                />
              </div>
            </div>

            {match.route && <RouteTimeline route={match.route} />}
          </div>
        ))}

        {myMatches.length === 0 && (
          <div className="text-center py-16 glass-card">
            <p className="text-3xl mb-3">🛣️</p>
            <p className="text-gray-400 text-lg">No active routes</p>
            <p className="text-gray-500 text-sm mt-2">
              {state.user?.role === 'driver' ? 'Waiting for AI to assign you a route...' : 'No routes available yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

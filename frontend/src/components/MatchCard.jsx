export default function MatchCard({ match }) {
  if (!match) return null

  const confidence = match.confidence_score ?? match.confidence ?? 0
  const pct = (confidence * 100).toFixed(0)

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'from-emerald-500 to-green-600'
    if (score >= 0.5) return 'from-amber-500 to-yellow-600'
    return 'from-red-500 to-rose-600'
  }

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Match #{match.id || '—'}</h3>
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getConfidenceColor(confidence)} text-white text-xs font-bold shadow-lg`}>
          {pct}% match
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Donor */}
        <div className="flex-1 text-center p-3 rounded-xl bg-donor-500/10 border border-donor-500/20">
          <div className="text-2xl mb-1">🍲</div>
          <div className="text-xs text-gray-400">Donor</div>
          <div className="text-sm font-medium text-donor-400 truncate">
            {match.donation?.food_type || 'Food'}
          </div>
          <div className="text-xs text-gray-500">{match.donation?.quantity_kg || '—'}kg</div>
        </div>

        {/* Arrow */}
        <div className="text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        {/* Driver */}
        <div className="flex-1 text-center p-3 rounded-xl bg-driver-500/10 border border-driver-500/20">
          <div className="text-2xl mb-1">🚗</div>
          <div className="text-xs text-gray-400">Driver</div>
          <div className="text-sm font-medium text-driver-400">
            ID: {match.driver_id || '—'}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        {/* Shelter */}
        <div className="flex-1 text-center p-3 rounded-xl bg-shelter-500/10 border border-shelter-500/20">
          <div className="text-2xl mb-1">🏠</div>
          <div className="text-xs text-gray-400">Shelter</div>
          <div className="text-sm font-medium text-shelter-400">
            ID: {match.shelter_id || '—'}
          </div>
        </div>
      </div>

      {match.estimated_minutes && (
        <div className="mt-3 text-center text-xs text-gray-500">
          Est. delivery: {Math.round(match.estimated_minutes)} min
        </div>
      )}
    </div>
  )
}

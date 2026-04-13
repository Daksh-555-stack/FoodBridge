export default function RouteTimeline({ route }) {
  if (!route || !route.stops) return null

  const stops = route.stops || []

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Route</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{route.total_distance_km?.toFixed(1)} km</span>
          <span>•</span>
          <span>{route.total_duration_min?.toFixed(0)} min</span>
          {route.improvement_pct > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-400">↑{route.improvement_pct}% optimized</span>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        {stops.map((stop, i) => (
          <div key={i} className="flex items-start gap-3 mb-4 last:mb-0">
            {/* Timeline Connector */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                stop.type === 'pickup'
                  ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white'
                  : 'bg-gradient-to-br from-rose-400 to-red-600 text-white'
              }`}>
                {i + 1}
              </div>
              {i < stops.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-700 mt-1" />
              )}
            </div>

            {/* Stop Info */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2">
                <span className={`status-badge ${
                  stop.type === 'pickup'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {stop.type}
                </span>
                <span className="text-sm text-gray-300">{stop.food_summary || ''}</span>
              </div>
              {stop.eta_utc && (
                <div className="text-xs text-gray-500 mt-1">
                  ETA: {new Date(stop.eta_utc).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

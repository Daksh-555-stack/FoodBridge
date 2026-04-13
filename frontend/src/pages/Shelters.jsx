import { useQuery } from '@tanstack/react-query'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import MatchCard from '../components/MatchCard'

export default function Shelters() {
  const { state } = useApp()

  const { data: shelters = [] } = useQuery({
    queryKey: ['shelters-list'],
    queryFn: async () => { const { data } = await api.get('/shelters'); return data },
    refetchInterval: 30000,
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['shelter-matches'],
    queryFn: async () => { try { const { data } = await api.get('/matches'); return data } catch { return [] } },
    refetchInterval: 15000,
  })

  const myShelter = shelters.find(s => s.id === state.user?.id)
  const myIncoming = matches.filter(m => m.shelter_id === state.user?.id)
  const displayShelters = state.user?.role === 'shelter' ? (myShelter ? [myShelter] : []) : shelters

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">{state.user?.role === 'shelter' ? 'My Shelter' : 'All Shelters'}</h1>
        <p className="text-gray-500 mt-1">{shelters.length} shelters registered</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {displayShelters.map((s) => {
          const pct = s.capacity_kg > 0 ? (s.current_load_kg / s.capacity_kg) * 100 : 0
          return (
            <div key={s.id} className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 flex items-center justify-center text-3xl">🏠</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{s.user?.name || `Shelter #${s.id}`}</h3>
                  <p className="text-sm text-gray-500">{s.address || 'No address'}</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Capacity</span><span>{pct.toFixed(0)}% used</span>
                </div>
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${pct > 80 ? 'bg-gradient-to-r from-red-500 to-rose-500' : pct > 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{s.current_load_kg.toFixed(1)} kg stored</span>
                  <span>{(s.capacity_kg - s.current_load_kg).toFixed(1)} kg available</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {state.user?.role === 'shelter' && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Incoming Deliveries</h2>
          <div className="space-y-4">
            {myIncoming.length > 0 ? myIncoming.map(m => <MatchCard key={m.id} match={m} />) : (
              <div className="glass-card p-8 text-center"><p className="text-gray-500">No incoming deliveries</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { getOverview, getUsers, approveUser, getAllRestaurants, approveRestaurant, approveShelter } from '../../api/admin'
import toast from 'react-hot-toast'

function SkeletonCard() {
  return (
    <div className="animate-pulse glass-card p-5">
      <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-8 bg-gray-700 rounded w-1/2" />
    </div>
  )
}

export default function AdminDashboard() {
  const { state } = useApp()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, us, rest] = await Promise.all([
        getOverview(), getUsers(), getAllRestaurants(),
      ])
      setOverview(ov.data)
      setUsers(us.data)
      setRestaurants(rest.data)
    } catch { }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [])

  const handleApproveUser = async (userId) => {
    try {
      await approveUser(userId)
      toast.success('User approved!')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u))
    } catch { toast.error('Failed to approve') }
  }

  const handleApproveRestaurant = async (id) => {
    try {
      await approveRestaurant(id)
      toast.success('Restaurant approved!')
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch { toast.error('Failed to approve') }
  }

  const stats = overview ? [
    { label: 'Total Users', value: overview.total_users, icon: '👥', color: 'from-blue-500 to-indigo-600' },
    { label: 'Donors', value: overview.total_donors, icon: '🍲', color: 'from-emerald-500 to-green-600' },
    { label: 'Drivers', value: overview.total_drivers, icon: '🚗', color: 'from-blue-500 to-cyan-600' },
    { label: 'Shelters', value: overview.total_shelters, icon: '🏠', color: 'from-rose-500 to-red-600' },
    { label: 'Total Listings', value: overview.total_listings, icon: '📋', color: 'from-purple-500 to-violet-600' },
    { label: 'Active Listings', value: overview.active_listings, icon: '✅', color: 'from-teal-500 to-cyan-600' },
    { label: 'Total Claims', value: overview.total_claims, icon: '📦', color: 'from-amber-500 to-orange-600' },
    { label: 'Deliveries', value: overview.total_deliveries, icon: '🛣️', color: 'from-indigo-500 to-blue-600' },
    { label: 'Completed', value: overview.completed_deliveries, icon: '🎉', color: 'from-green-500 to-emerald-600' },
    { label: 'Food Rescued', value: `${overview.total_food_rescued_kg} kg`, icon: '🌍', color: 'from-red-500 to-rose-600' },
  ] : []

  const pendingUsers = users.filter(u => !u.is_approved && u.role !== 'admin')
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Admin Panel — <span className="bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">FoodBridge AI</span>
        </h1>
        <p className="text-gray-500 mt-1">System overview and management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {['overview', 'users', 'restaurants'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Array(10).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((s, i) => (
              <div key={s.label} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${s.color} text-white text-lg mb-3 shadow-lg`}>{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-6">
          {pendingUsers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">⏳ Pending Approval ({pendingUsers.length})</h3>
              <div className="space-y-2">
                {pendingUsers.map(u => (
                  <div key={u.id} className="glass-card p-4 flex items-center justify-between border-l-4 border-amber-500">
                    <div>
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-gray-500 text-sm">{u.email} • <span className="capitalize">{u.role}</span></p>
                    </div>
                    <button onClick={() => handleApproveUser(u.id)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all">
                      ✓ Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">All Users ({users.length})</h3>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-sm text-gray-200">{u.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">{u.email}</td>
                      <td className="py-3 px-4"><span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{u.role}</span></td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_approved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {u.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Restaurants */}
      {tab === 'restaurants' && (
        <div className="space-y-6">
          {pendingRestaurants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">⏳ Pending Restaurants ({pendingRestaurants.length})</h3>
              <div className="space-y-2">
                {pendingRestaurants.map(r => (
                  <div key={r.id} className="glass-card p-4 flex items-center justify-between border-l-4 border-amber-500">
                    <div>
                      <p className="text-white font-medium">{r.name}</p>
                      <p className="text-gray-500 text-sm">{r.address} • FSSAI: {r.fssai_number || '—'}</p>
                    </div>
                    <button onClick={() => handleApproveRestaurant(r.id)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all">
                      ✓ Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">All Restaurants ({restaurants.length})</h3>
            <div className="space-y-2">
              {restaurants.map(r => (
                <div key={r.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{r.name}</p>
                    <p className="text-gray-500 text-sm">{r.address} • {r.city}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : r.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

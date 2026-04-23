import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getMyListings, deleteListing } from '../../api/listings'
import { getMyRestaurants } from '../../api/restaurants'
import ExpiryCountdown from '../../components/ExpiryCountdown'
import toast from 'react-hot-toast'

const statusColors = {
  available: 'bg-emerald-500/20 text-emerald-400',
  claimed: 'bg-blue-500/20 text-blue-400',
  in_transit: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-300',
  expired: 'bg-red-500/20 text-red-400',
}

function SkeletonCard() {
  return (
    <div className="animate-pulse p-4 rounded-xl bg-gray-800/40">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-700 rounded w-1/3" />
    </div>
  )
}

export default function DonorDashboard() {
  const { state } = useApp()
  const [listings, setListings] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const [listingsRes, restaurantsRes] = await Promise.all([
        getMyListings(),
        getMyRestaurants(),
      ])
      setListings(listingsRes.data)
      setRestaurant(restaurantsRes.data?.[0] || null)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return
    try {
      await deleteListing(id)
      setListings(prev => prev.filter(l => l.id !== id))
      toast.success('Listing deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed to delete')
    }
  }

  const available = listings.filter(l => l.status === 'available').length
  const delivered = listings.filter(l => l.status === 'delivered').length
  const canListFood = restaurant?.status === 'approved'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">
          Welcome, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{state.user?.name}</span>
        </h1>
        <p className="text-gray-500 mt-1">Manage your food donations and listings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'My Listings', value: listings.length, icon: '🍲', color: 'from-emerald-500 to-green-600' },
          { label: 'Currently Available', value: available, icon: '✅', color: 'from-blue-500 to-cyan-600' },
          { label: 'Delivered', value: delivered, icon: '🎉', color: 'from-amber-500 to-orange-600' },
        ].map((card, i) => (
          <div key={card.label} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${card.color} text-white text-lg mb-3 shadow-lg`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-white">{loading ? '—' : card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Restaurant approval status */}
      <div className="mb-8">
        {loading ? (
          <SkeletonCard />
        ) : !restaurant ? (
          <div className="glass-card p-6 border-l-4 border-amber-500">
            <h2 className="text-xl font-bold text-white mb-2">Register Your Restaurant First</h2>
            <p className="text-gray-500 text-sm mb-4">Add your restaurant before creating food listings.</p>
            <Link to="/donor/register-restaurant" className="inline-flex px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              Register Restaurant
            </Link>
          </div>
        ) : restaurant.status === 'pending' ? (
          <div className="glass-card p-6 border-l-4 border-amber-500 bg-amber-500/5">
            <h2 className="text-xl font-bold text-amber-400 mb-2">Restaurant Under Review</h2>
            <p className="text-white font-semibold">{restaurant.name}</p>
            <p className="text-gray-400 text-sm mt-2">You can list food once admin approves your restaurant.</p>
          </div>
        ) : restaurant.status === 'approved' ? (
          <div className="glass-card p-6 border-l-4 border-green-500 bg-green-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{restaurant.name} <span className="text-green-400">✓</span></h2>
              <p className="text-green-400 text-sm font-semibold">Approved — Ready to list food</p>
            </div>
            <Link to="/donor/list-food" className="px-6 py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 inline-flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 0 20px rgba(220,38,38,0.4)' }}>
              + List Food
            </Link>
          </div>
        ) : (
          <div className="glass-card p-6 border-l-4 border-red-500 bg-red-500/5">
            <h2 className="text-xl font-bold text-red-400 mb-2">Restaurant Rejected</h2>
            <p className="text-gray-400 text-sm mb-4">Please contact support.</p>
            <Link to="/donor/register-restaurant" className="inline-flex px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              Register New Restaurant
            </Link>
          </div>
        )}
      </div>

      {/* Listings table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Listings</h2>

        {loading ? (
          <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchDashboard} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all">Retry</button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No listings yet</p>
            <p className="text-gray-600 text-sm mb-4">Start by listing surplus food from your restaurant</p>
            {canListFood && (
              <Link to="/donor/list-food" className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
                List Food Now
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-3 px-2">Food Name</th>
                  <th className="text-left py-3 px-2">Qty</th>
                  <th className="text-left py-3 px-2">Expiry</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="text-sm font-medium text-gray-200">{l.food_name}</div>
                      <div className="text-xs text-gray-500">{l.food_type}</div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-300">{l.quantity_kg} kg</td>
                    <td className="py-3 px-2"><ExpiryCountdown expiryDatetime={l.expiry_time} /></td>
                    <td className="py-3 px-2">
                      <span className={`status-badge ${statusColors[l.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {l.status === 'available' && (
                        <button onClick={() => handleDelete(l.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-lg hover:bg-red-500/10">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

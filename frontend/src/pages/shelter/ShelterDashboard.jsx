import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getListings } from '../../api/listings'
import { getMyClaims } from '../../api/claims'
import { getMyShelter } from '../../api/shelters'
import ExpiryCountdown from '../../components/ExpiryCountdown'
import ClaimFoodModal from './ClaimFoodModal'
import toast from 'react-hot-toast'

const claimStatusColors = {
  pending: 'bg-amber-500/20 text-amber-400',
  driver_assigned: 'bg-blue-500/20 text-blue-400',
  picked_up: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-red-500/20 text-red-400',
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function SkeletonCard() {
  return (
    <div className="animate-pulse glass-card p-5">
      <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-700 rounded w-full" />
    </div>
  )
}

export default function ShelterDashboard() {
  const { state } = useApp()
  const [shelter, setShelter] = useState(null)
  const [shelterLoading, setShelterLoading] = useState(true)
  const [shelterError, setShelterError] = useState(null)
  const [listings, setListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [claims, setClaims] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [claimModal, setClaimModal] = useState(null)

  const fetchShelter = useCallback(async () => {
    try {
      const { data } = await getMyShelter()
      setShelter(data)
      setShelterError(null)
    } catch (err) {
      if (err.response?.status === 404) {
        setShelterError('not_registered')
      } else {
        setShelterError('error')
      }
    } finally {
      setShelterLoading(false)
    }
  }, [])

  const fetchListings = useCallback(async () => {
    try {
      const { data } = await getListings({ status_filter: 'available' })
      setListings(data)
    } catch { }
    finally { setListingsLoading(false) }
  }, [])

  const fetchClaims = useCallback(async () => {
    try {
      const { data } = await getMyClaims()
      setClaims(data)
    } catch { }
    finally { setClaimsLoading(false) }
  }, [])

  useEffect(() => {
    fetchShelter()
    fetchListings()
    fetchClaims()
  }, [])

  const onClaimSuccess = () => {
    setClaimModal(null)
    fetchListings()
    fetchClaims()
  }

  // Not registered state
  if (shelterLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
  }

  if (shelterError === 'not_registered') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card p-10">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold text-white mb-2">Register Your Shelter</h2>
          <p className="text-gray-400 text-sm mb-6">You need to register your shelter before claiming food.</p>
          <Link to="/shelter/register" className="px-6 py-3 rounded-xl text-white font-semibold text-sm inline-block"
            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
            Register Your Shelter →
          </Link>
        </div>
      </div>
    )
  }

  if (shelter && shelter.status === 'pending') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card p-10">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">{shelter.name}</h2>
          <div className="inline-block px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold mb-4">
            Awaiting Admin Approval
          </div>
          <p className="text-gray-400 text-sm">Your shelter registration is being reviewed. You'll be able to claim food once approved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Shelter Dashboard — <span className="bg-gradient-to-r from-rose-400 to-red-300 bg-clip-text text-transparent">{shelter?.name}</span>
        </h1>
        <p className="text-gray-500 mt-1">Browse available food and manage your claims</p>
      </div>

      {/* Available food listings */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-4">🍲 Available Food</h2>
        {listingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : listings.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500">No food available right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(l => {
              const dist = shelter ? haversineKm(shelter.lat, shelter.lng, l.pickup_lat, l.pickup_lng).toFixed(1) : '?'
              return (
                <div key={l.id} className="glass-card p-5 hover:border-red-500/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{l.food_name}</h3>
                      <p className="text-xs text-gray-500">{l.restaurant?.name || 'Restaurant'}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${l.food_type === 'veg' ? 'bg-green-500/20 text-green-400' : l.food_type === 'vegan' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {l.food_type === 'non_veg' ? 'Non-Veg' : l.food_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span>📦 {l.quantity_kg} kg</span>
                    <span>📍 {dist} km</span>
                  </div>

                  <div className="mb-4">
                    <ExpiryCountdown expiryDatetime={l.expiry_time} />
                  </div>

                  <button onClick={() => setClaimModal(l)}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 0 15px rgba(220,38,38,0.3)' }}>
                    Claim This Food
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Claims */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">📋 My Claims</h2>
        {claimsLoading ? (
          <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
        ) : claims.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500">No claims yet — claim available food above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map(c => (
              <div key={c.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">📦</span>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{c.listing?.food_name || 'Food item'}</div>
                    <div className="text-xs text-gray-500">{c.listing?.quantity_kg || '?'} kg • {c.delivery_address}</div>
                  </div>
                </div>
                <span className={`status-badge ${claimStatusColors[c.status] || 'bg-gray-500/20 text-gray-400'}`}>
                  {c.status === 'driver_assigned' ? 'Driver Assigned' : c.status === 'picked_up' ? 'Picked Up' : c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim modal */}
      {claimModal && (
        <ClaimFoodModal listing={claimModal} shelter={shelter}
          onClose={() => setClaimModal(null)} onSuccess={onClaimSuccess} />
      )}
    </div>
  )
}

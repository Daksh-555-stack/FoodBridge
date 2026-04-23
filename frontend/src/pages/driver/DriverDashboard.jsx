import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getAvailableClaims } from '../../api/claims'
import { acceptDelivery, getMyDeliveries, markPickedUp, markDelivered, updateDriverLocation } from '../../api/deliveries'
import { getMyDriverProfile, updateDriverAvailability } from '../../api/drivers'
import ExpiryCountdown from '../../components/ExpiryCountdown'
import toast from 'react-hot-toast'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl p-5" style={{ background: '#242424' }}>
      <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-700 rounded w-full" />
    </div>
  )
}

export default function DriverDashboard() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [driverProfile, setDriverProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [available, setAvailable] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [availableClaims, setAvailableClaims] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(true)
  const [deliveriesLoading, setDeliveriesLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [driverPos, setDriverPos] = useState(null)
  const pollRef = useRef(null)

  // Fetch driver profile
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await getMyDriverProfile()
      setDriverProfile(data)
      setAvailable(data.is_available)
      setProfileError(null)
    } catch (err) {
      if (err.response?.status === 404) {
        setProfileError('not_registered')
      } else {
        setProfileError('error')
      }
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const fetchClaims = useCallback(async () => {
    try {
      const { data } = await getAvailableClaims()
      setAvailableClaims(data)
    } catch {} finally { setClaimsLoading(false) }
  }, [])

  const fetchDeliveries = useCallback(async () => {
    try {
      const { data } = await getMyDeliveries()
      setDeliveries(data)
    } catch {} finally { setDeliveriesLoading(false) }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchClaims()
    fetchDeliveries()
  }, [])

  // Poll for new claims every 30s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchClaims()
      fetchDeliveries()
    }, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchClaims, fetchDeliveries])

  // GPS position
  useEffect(() => {
    if (!navigator.geolocation) {
      setDriverPos({ lat: 23.2599, lng: 77.4126 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setDriverPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setDriverPos({ lat: 23.2599, lng: 77.4126 }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Toggle availability
  const handleToggle = async () => {
    setToggling(true)
    try {
      const newVal = !available
      await updateDriverAvailability({ is_available: newVal })
      setAvailable(newVal)
      if (newVal && driverPos) {
        try { await updateDriverLocation(driverPos) } catch {}
      }
      toast.success(newVal ? "You're now available! 🟢" : "You're off duty 🔴")
    } catch (err) {
      toast.error('Failed to update availability')
    } finally { setToggling(false) }
  }

  const handleAccept = async (claimId) => {
    setAcceptingId(claimId)
    try {
      const { data } = await acceptDelivery({ claim_id: claimId })
      toast.success('Delivery accepted! 🚗')
      navigate(`/driver/navigate/${data.id}`)
    } catch (err) {
      const code = err.response?.data?.detail?.code
      if (code === 'DELIVERY_CONFLICT' || err.response?.status === 409) {
        toast.error('Sorry, another driver just accepted this')
      } else {
        toast.error(err.response?.data?.detail?.message || 'Failed to accept delivery')
      }
      fetchClaims()
    } finally {
      setAcceptingId(null)
    }
  }

  const handlePickup = async (deliveryId) => {
    setActionLoading(deliveryId)
    try {
      await markPickedUp(deliveryId)
      toast.success('Marked as picked up! 📦')
      fetchDeliveries()
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed to mark pickup')
    } finally { setActionLoading(null) }
  }

  const handleDeliver = async (deliveryId) => {
    setActionLoading(deliveryId)
    try {
      await markDelivered(deliveryId)
      toast.success('Delivery completed! 🎉')
      fetchDeliveries()
      fetchClaims()
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed to mark delivered')
    } finally { setActionLoading(null) }
  }

  const activeDeliveries = deliveries.filter(d => ['assigned', 'picked_up'].includes(d.status))
  const completedCount = deliveries.filter(d => d.status === 'delivered').length

  // Not registered
  if (profileLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><SkeletonCard /><SkeletonCard /></div>
  }

  if (profileError === 'not_registered') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl p-10" style={{ background: '#1c1c1c', border: '1px solid #333' }}>
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-white mb-2">Register as Driver</h2>
          <p className="text-gray-400 text-sm mb-6">Set up your driver profile to start accepting deliveries</p>
          <Link to="/driver/register" className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
            Register Now →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#1c1c1c' }}>
      {/* Top Bar */}
      <div className="sticky top-16 z-40 px-4 py-3 flex items-center justify-between" style={{ background: '#1c1c1c', borderBottom: '1px solid #333' }}>
        <div>
          <span className="text-white font-bold text-lg">FoodBridge</span>
          <span className="text-gray-500 text-sm ml-2">— Driver Mode</span>
        </div>
        {/* Availability Toggle */}
        <button onClick={handleToggle} disabled={toggling}
          className="flex items-center gap-3 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-500"
          style={{
            background: available ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${available ? '#10b981' : '#555'}`,
            color: available ? '#10b981' : '#888',
          }}>
          <div className="relative w-12 h-6 rounded-full transition-all duration-300"
            style={{ background: available ? '#10b981' : '#555' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
              style={{ left: available ? '26px' : '2px' }} />
          </div>
          {toggling ? 'Updating...' : available ? "I'm Available" : 'Off Duty'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Available Jobs', value: availableClaims.length, icon: '📋', bg: '#2a2000', border: '#f59e0b' },
            { label: 'Active', value: activeDeliveries.length, icon: '🚗', bg: '#001a2e', border: '#3b82f6' },
            { label: 'Completed', value: completedCount, icon: '✅', bg: '#002a1a', border: '#10b981' },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-4 text-center" style={{ background: c.bg, border: `1px solid ${c.border}30` }}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-xl font-bold text-white">{claimsLoading ? '—' : c.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* ═══════ Active Delivery ═══════ */}
        {activeDeliveries.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active Delivery
            </h2>
            {activeDeliveries.map(d => (
              <div key={d.id} className="rounded-2xl p-5 space-y-4" style={{ background: '#242424', borderLeft: '4px solid #10b981', border: '1px solid #333', borderLeftWidth: '4px', borderLeftColor: '#10b981' }}>
                {/* Food info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">{d.claim?.listing?.food_name || 'Food'}</h3>
                    <p className="text-sm text-gray-400">{d.claim?.listing?.quantity_kg} kg • {d.claim?.listing?.food_type}</p>
                  </div>
                  {d.claim?.listing?.expiry_time && (
                    <ExpiryCountdown expiryDatetime={d.claim.listing.expiry_time} />
                  )}
                </div>

                {/* Address blocks */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: '#1a2e1a', border: '1px solid #10b98130' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 text-xs font-bold uppercase">📍 Pickup</span>
                    </div>
                    <p className="text-white text-sm font-medium">{d.claim?.listing?.restaurant?.name || 'Restaurant'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{d.pickup_address || `${d.pickup_lat?.toFixed(4)}, ${d.pickup_lng?.toFixed(4)}`}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#2e1a1a', border: '1px solid #ef444430' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400 text-xs font-bold uppercase">🏠 Drop-off</span>
                    </div>
                    <p className="text-white text-sm font-medium">{d.claim?.shelter?.name || 'Shelter'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{d.dropoff_address || `${d.dropoff_lat?.toFixed(4)}, ${d.dropoff_lng?.toFixed(4)}`}</p>
                  </div>
                </div>

                {d.distance_km && (
                  <p className="text-xs text-gray-500">📏 {d.distance_km} km • ~{d.duration_min} min estimated</p>
                )}

                {/* Nav Map Button */}
                <Link to={`/driver/navigate/${d.id}`}
                  className="block w-full py-3.5 rounded-xl text-center text-white font-bold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 25px rgba(16,185,129,0.4)' }}>
                  🗺️ Open Navigation Map
                </Link>

                {/* Status buttons */}
                <div className="flex gap-3">
                  {d.status === 'assigned' && (
                    <button onClick={() => handlePickup(d.id)} disabled={actionLoading === d.id}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}>
                      {actionLoading === d.id ? 'Updating...' : '📦 Mark as Picked Up'}
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button onClick={() => handleDeliver(d.id)} disabled={actionLoading === d.id}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 15px rgba(245,158,11,0.3)' }}>
                      {actionLoading === d.id ? 'Updating...' : '✅ Mark as Delivered'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#242424', border: '1px solid #333' }}>
            <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
              <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: available ? '#10b981' : '#555' }} />
              <span className="text-sm font-medium">No active delivery</span>
            </div>
            <p className="text-gray-600 text-xs">
              {available ? 'Waiting for an available job below' : 'Toggle availability to start accepting deliveries'}
            </p>
          </div>
        )}

        {/* ═══════ Available Jobs ═══════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">📋 Available Delivery Jobs</h2>
            <button onClick={() => { setClaimsLoading(true); fetchClaims() }}
              className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded-lg hover:bg-gray-800 transition-all">
              ↻ Refresh
            </button>
          </div>

          {claimsLoading ? (
            <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
          ) : availableClaims.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#242424', border: '1px solid #333' }}>
              <p className="text-gray-500 text-sm">No pending delivery jobs right now.</p>
              <p className="text-gray-600 text-xs mt-1">New jobs appear when shelters claim food. Auto-refreshing every 30s.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableClaims.map(c => {
                const dist = driverPos && c.listing?.pickup_lat
                  ? haversineKm(driverPos.lat, driverPos.lng, c.listing.pickup_lat, c.listing.pickup_lng).toFixed(1)
                  : null
                const isUrgent = c.listing?.expiry_time && (new Date(c.listing.expiry_time) - Date.now()) < 3600000

                return (
                  <div key={c.id} className="rounded-2xl p-5 transition-all duration-300"
                    style={{
                      background: '#242424',
                      border: isUrgent ? '1px solid #ef4444' : '1px solid #333',
                      animation: isUrgent ? 'pulse 2s infinite' : 'none',
                    }}>
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{c.listing?.food_name || 'Food'}</h3>
                        <p className="text-gray-500 text-xs">{c.listing?.restaurant?.name || 'Restaurant'} → {c.shelter?.name || 'Shelter'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.listing?.food_type === 'veg' ? 'bg-green-500/20 text-green-400' : c.listing?.food_type === 'vegan' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {c.listing?.food_type === 'non_veg' ? 'Non-Veg' : c.listing?.food_type}
                        </span>
                        <span className="text-gray-400 text-sm font-semibold">{c.listing?.quantity_kg} kg</span>
                      </div>
                    </div>

                    {/* Location rows */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 text-sm mt-0.5">📍</span>
                        <div>
                          <p className="text-gray-300 text-sm">{(c.listing?.pickup_address || '').slice(0, 60)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 text-sm mt-0.5">🏠</span>
                        <div>
                          <p className="text-gray-300 text-sm">{(c.delivery_address || '').slice(0, 60)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Distance + Expiry */}
                    <div className="flex items-center justify-between mb-4">
                      {dist && <span className="text-gray-500 text-sm">~{dist} km away</span>}
                      {c.listing?.expiry_time && (
                        <div className={isUrgent ? 'text-red-400 font-bold text-sm' : ''}>
                          <ExpiryCountdown expiryDatetime={c.listing.expiry_time} />
                        </div>
                      )}
                    </div>

                    {/* Accept */}
                    <button onClick={() => handleAccept(c.id)} disabled={acceptingId === c.id}
                      className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                      style={{
                        background: acceptingId === c.id ? '#065f46' : 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 0 20px rgba(16,185,129,0.3)',
                      }}>
                      {acceptingId === c.id ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Accepting...</>
                      ) : '🚗 Accept This Delivery'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

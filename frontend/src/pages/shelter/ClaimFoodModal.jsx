import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { createClaim } from '../../api/claims'
import toast from 'react-hot-toast'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapPicker({ position, setPosition, setAddress }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
        .then(r => r.json()).then(d => setAddress(d.display_name || '')).catch(() => {})
    },
  })
  return position ? <Marker position={position} draggable eventHandlers={{
    dragend: (e) => {
      const { lat, lng } = e.target.getLatLng()
      setPosition([lat, lng])
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json()).then(d => setAddress(d.display_name || '')).catch(() => {})
    }
  }} /> : null
}

export default function ClaimFoodModal({ listing, shelter, onClose, onSuccess }) {
  const [mode, setMode] = useState(shelter?.lat ? 'shelter' : 'custom')
  const [customPosition, setCustomPosition] = useState(null)
  const [customAddress, setCustomAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getDeliveryData = () => {
    if (mode === 'shelter' && shelter?.lat && shelter?.lng) {
      return {
        delivery_lat: shelter.lat,
        delivery_lng: shelter.lng,
        delivery_address: shelter.address || `${shelter.name}`,
      }
    }
    if (mode === 'custom' && customPosition) {
      return {
        delivery_lat: customPosition[0],
        delivery_lng: customPosition[1],
        delivery_address: customAddress || `${customPosition[0].toFixed(4)}, ${customPosition[1].toFixed(4)}`,
      }
    }
    return null
  }

  const handleClaim = async () => {
    const deliveryData = getDeliveryData()
    if (!deliveryData || !deliveryData.delivery_lat || deliveryData.delivery_lat === 0) {
      setError('Please select your delivery location on the map')
      return
    }
    setError('')
    setLoading(true)
    try {
      await createClaim({
        listing_id: listing.id,
        ...deliveryData,
      })
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.detail?.message || 'Failed to claim food'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onSuccess}>
        <div className="glass-card p-8 max-w-md mx-4 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Food Claimed!</h2>
          <p className="text-gray-400 text-sm mb-6">Waiting for a driver to accept the delivery. You'll be notified when one is assigned.</p>
          <button onClick={onSuccess} className="px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
            Got it!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Confirm Delivery Location</h2>
            <p className="text-gray-500 text-sm mt-1">Where should <span className="text-white font-medium">{listing.food_name}</span> ({listing.quantity_kg} kg) be delivered?</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Location mode toggle */}
        <div className="flex gap-2 mb-5">
          {shelter?.lat && (
            <button onClick={() => setMode('shelter')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${mode === 'shelter' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 text-gray-400'}`}>
              🏠 My Shelter Location
            </button>
          )}
          <button onClick={() => setMode('custom')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${mode === 'custom' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-gray-700 text-gray-400'}`}>
            📍 Custom Location
          </button>
        </div>

        {/* Shelter location */}
        {mode === 'shelter' && shelter?.lat && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-white font-medium text-sm">Deliver to: {shelter.name}</span>
            </div>
            <p className="text-gray-400 text-xs">{shelter.address}</p>
            <p className="text-gray-600 text-xs mt-1">lat: {shelter.lat}, lng: {shelter.lng}</p>
          </div>
        )}

        {/* Custom location map */}
        {mode === 'custom' && (
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-2">Click on the map to set your delivery location</p>
            <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 280 }}>
              <MapContainer center={shelter?.lat ? [shelter.lat, shelter.lng] : [23.2599, 77.4126]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapPicker position={customPosition} setPosition={setCustomPosition} setAddress={setCustomAddress} />
              </MapContainer>
            </div>
            {customAddress && <p className="text-sm text-gray-400 mt-2">📍 {customAddress}</p>}
            {customPosition && <p className="text-xs text-gray-600 mt-1">lat: {customPosition[0].toFixed(5)}, lng: {customPosition[1].toFixed(5)}</p>}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">{error}</div>
        )}

        {/* Submit */}
        <button onClick={handleClaim} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
          style={{ background: loading ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 0 15px rgba(220,38,38,0.3)' }}>
          {loading ? 'Claiming...' : '📦 Confirm Claim'}
        </button>
      </div>
    </div>
  )
}

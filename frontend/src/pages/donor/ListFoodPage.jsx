import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import api from '../../api/client'
import { getMyRestaurants } from '../../api/restaurants'
import toast from 'react-hot-toast'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function LocationPicker({ position, setPosition, setAddress }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      console.log('pickup_lat:', lat, 'pickup_lng:', lng)
      setPosition([lat, lng])
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json()).then(d => setAddress(d.display_name || ''))
        .catch(() => {})
    },
  })
  return position ? <Marker position={position} draggable
    eventHandlers={{
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng()
        console.log('pickup_lat:', lat, 'pickup_lng:', lng)
        setPosition([lat, lng])
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json()).then(d => setAddress(d.display_name || ''))
          .catch(() => {})
      }
    }}
  /> : null
}

export default function ListFoodPage() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [restaurantStatus, setRestaurantStatus] = useState('loading')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [position, setPosition] = useState(null)
  const [address, setAddress] = useState('')

  const [form, setForm] = useState({
    food_name: '', description: '', quantity_kg: '', food_type: 'veg',
    expiry_time: '', restaurant_id: '', pickup_address: '',
  })

  useEffect(() => {
    getMyRestaurants().then(({ data }) => {
      const primaryRestaurant = data?.[0]
      setRestaurantStatus(primaryRestaurant?.status || 'missing')
      const approved = data.filter(r => r.status === 'approved')
      setRestaurants(approved)
      if (approved.length === 1) setForm(f => ({ ...f, restaurant_id: approved[0].id }))
    }).catch(() => {
      setRestaurantStatus('missing')
    })
  }, [])

  useEffect(() => {
    if (address) setForm(f => ({ ...f, pickup_address: address }))
  }, [address])

  const validate = () => {
    if (!form.food_name) return 'Food name is required'
    const quantity = parseFloat(form.quantity_kg)
    if (!form.quantity_kg || Number.isNaN(quantity) || quantity < 0.1) return 'Quantity must be at least 0.1 kg'
    if (!['veg', 'non_veg', 'vegan'].includes(form.food_type)) return 'Please select a valid food type'
    if (!form.expiry_time) return 'Expiry date and time is required'
    const expiry = new Date(form.expiry_time)
    if (Number.isNaN(expiry.getTime())) return 'Expiry date and time is invalid'
    const diffMinutes = (expiry - new Date()) / 1000 / 60
    if (diffMinutes < 30) return 'Expiry time must be at least 30 minutes from now'
    if (!position || position[0] == null || position[1] == null) return 'Please click on the map to select pickup location'
    if (!form.restaurant_id) return 'Please select a restaurant'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('fb_access_token') || localStorage.getItem('foodbridge_token')
      console.log('Token exists:', Boolean(token))
      if (!token) {
        setFormError('You are not logged in. Please login again.')
        navigate('/')
        return
      }

      if (!position || position[0] == null || position[1] == null) {
        setFormError('Please click on the map to select pickup location')
        return
      }

      const err = validate()
      if (err) { setFormError(err); return }

      const payload = {
        food_name: form.food_name,
        description: form.description || '',
        quantity_kg: parseFloat(form.quantity_kg),
        food_type: form.food_type,
        expiry_time: new Date(form.expiry_time).toISOString(),
        pickup_lat: parseFloat(position[0]),
        pickup_lng: parseFloat(position[1]),
        pickup_address: form.pickup_address || address || '',
        restaurant_id: form.restaurant_id,
      }

      console.log('restaurant_id being sent:', payload.restaurant_id)
      console.log('pickup_lat:', payload.pickup_lat, 'pickup_lng:', payload.pickup_lng)
      console.log('Sending payload:', payload)
      console.log('Submitting payload:', JSON.stringify(payload, null, 2))

      const response = await api.post('/api/listings', payload)
      console.log('Success:', response.data)
      toast.success('Food listed for rescue! 🎉')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error detail:', error.response?.data)

      const detail = error.response?.data?.detail
      const message = error.code === 'ERR_NETWORK'
        ? 'Cannot connect to server. Make sure the backend is running on port 8000. Check your terminal.'
        : (
            (typeof detail === 'string' ? detail : null) ||
            (detail?.message || null) ||
            (Array.isArray(detail) ? detail.map(item => item.msg || item.message || JSON.stringify(item)).join(', ') : null) ||
            error.response?.data?.message ||
            error.message ||
            'Failed to create listing'
          )
      setFormError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">List Food for Rescue</h1>
        <p className="text-gray-500 mt-1">Share surplus food with shelters in need</p>
      </div>

      {restaurantStatus === 'loading' ? (
        <div className="glass-card p-8 text-center text-gray-400">Checking restaurant approval...</div>
      ) : restaurantStatus !== 'approved' ? (
        <div className="glass-card p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Your restaurant must be approved before listing food.</h2>
          <p className="text-gray-500 text-sm mb-6">You can return here once admin approval is complete.</p>
          <button type="button" onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
            Back to Dashboard
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 space-y-5">
          {/* Food Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Food Name *</label>
            <input type="text" className="input-field" placeholder="e.g. Biryani, Dal Rice"
              value={form.food_name} onChange={e => setForm({ ...form, food_name: e.target.value })} required />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea className="input-field" rows={2} placeholder="e.g. Fresh, serves 20 people"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity (kg) *</label>
            <input type="number" step="0.1" min="0.1" max="500" className="input-field" placeholder="e.g. 10"
              value={form.quantity_kg} onChange={e => setForm({ ...form, quantity_kg: e.target.value })} required />
          </div>

          {/* Food Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Food Type *</label>
            <div className="flex gap-4">
              {[{ v: 'veg', l: '🥬 Vegetarian' }, { v: 'non_veg', l: '🍗 Non-Veg' }, { v: 'vegan', l: '🌱 Vegan' }].map(t => (
                <label key={t.v} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${form.food_type === t.v ? 'border-red-500 bg-red-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                  <input type="radio" name="food_type" value={t.v} checked={form.food_type === t.v}
                    onChange={e => setForm({ ...form, food_type: e.target.value })} className="hidden" />
                  {t.l}
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expiry Date & Time *</label>
            <input type="datetime-local" className="input-field"
              value={form.expiry_time} onChange={e => setForm({ ...form, expiry_time: e.target.value })} required />
          </div>

          {/* Restaurant */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restaurant *</label>
            {restaurants.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                ⚠️ No approved restaurants found. <a href="/donor/register-restaurant" className="underline font-semibold">Register your restaurant first →</a>
              </div>
            ) : (
              <select className="input-field" value={form.restaurant_id}
                onChange={e => setForm({ ...form, restaurant_id: e.target.value })} required>
                <option value="" className="bg-gray-900">Select restaurant</option>
                {restaurants.map(r => (
                  <option key={r.id} value={r.id} className="bg-gray-900">{r.name} — {r.address}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="glass-card p-6">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pickup Location * — Click on map</label>
          <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 350 }}>
            <MapContainer center={[23.2599, 77.4126]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <LocationPicker position={position} setPosition={setPosition} setAddress={setAddress} />
            </MapContainer>
          </div>
          {address && <p className="text-sm text-gray-400 mt-2">📍 {address}</p>}
          {position && <p className="text-xs text-gray-600 mt-1">lat: {position[0].toFixed(5)}, lng: {position[1].toFixed(5)}</p>}
        </div>

        {/* Error */}
        {formError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{formError}</div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2"
          style={{ background: loading ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 0 20px rgba(220,38,38,0.4)' }}>
          {loading ? 'Creating...' : '🍲 List Food for Rescue'}
        </button>
      </form>
      )}
    </div>
  )
}

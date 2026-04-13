import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import L from 'leaflet'

export default function DonationNew() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [form, setForm] = useState({
    food_type: '',
    quantity_kg: '',
    expiry_datetime: '',
    pickup_lat: state.user?.lat || 23.2599,
    pickup_lng: state.user?.lng || 77.4126,
  })

  // Initialize mini map for location picking
  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([form.pickup_lat, form.pickup_lng], 14)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker([form.pickup_lat, form.pickup_lng], { draggable: true }).addTo(map)
    markerRef.current = marker

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      setForm(f => ({ ...f, pickup_lat: pos.lat, pickup_lng: pos.lng }))
    })

    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      setForm(f => ({ ...f, pickup_lat: e.latlng.lat, pickup_lng: e.latlng.lng }))
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        expiry_datetime: new Date(form.expiry_datetime).toISOString(),
      }

      const { data } = await api.post('/donations', payload)
      toast.success('🎉 Donation created! AI matching in progress...')
      navigate('/donations')
    } catch (err) {
      const msg = err.response?.data?.detail?.error || 'Failed to create donation'
      toast.error(typeof msg === 'string' ? msg : 'Failed to create donation')
    } finally {
      setLoading(false)
    }
  }

  // Set default expiry to 3 hours from now
  const getDefaultExpiry = () => {
    const d = new Date(Date.now() + 3 * 3600000)
    return d.toISOString().slice(0, 16)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-white">Donate Surplus Food</h1>
        <p className="text-gray-500 mt-1">List your surplus food and our AI will find the nearest shelter match instantly</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">🍲</span>
            Food Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Food Type</label>
              <select
                id="food-type"
                className="input-field"
                value={form.food_type}
                onChange={(e) => setForm({ ...form, food_type: e.target.value })}
                required
              >
                <option value="">Select food type...</option>
                <option value="Biryani">🍛 Biryani</option>
                <option value="Dal & Rice">🍚 Dal & Rice</option>
                <option value="Chapati & Sabzi">🫓 Chapati & Sabzi</option>
                <option value="Sandwiches">🥪 Sandwiches</option>
                <option value="Poha & Jalebi">🍜 Poha & Jalebi</option>
                <option value="Sweets">🍮 Sweets</option>
                <option value="Mixed Thali">🍽️ Mixed Thali</option>
                <option value="Bread & Bakery">🍞 Bread & Bakery</option>
                <option value="Fruits">🍎 Fruits</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Quantity (kg)</label>
              <input
                id="food-quantity"
                type="number"
                step="0.5"
                min="0.5"
                className="input-field"
                placeholder="e.g. 10"
                value={form.quantity_kg}
                onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Expiry Date & Time</label>
            <input
              id="food-expiry"
              type="datetime-local"
              className="input-field"
              value={form.expiry_datetime || getDefaultExpiry()}
              onChange={(e) => setForm({ ...form, expiry_datetime: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 30 minutes from now</p>
          </div>
        </div>

        {/* Pickup Location */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">📍</span>
            Pickup Location
          </h2>
          <p className="text-sm text-gray-500 mb-3">Click on the map or drag the marker to set pickup location</p>

          <div ref={mapRef} className="w-full h-64 rounded-xl overflow-hidden border border-gray-700" />

          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span>Lat: {form.pickup_lat.toFixed(4)}</span>
            <span>Lng: {form.pickup_lng.toFixed(4)}</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            id="submit-donation"
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Creating...' : '🚀 Submit Donation'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/donations')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

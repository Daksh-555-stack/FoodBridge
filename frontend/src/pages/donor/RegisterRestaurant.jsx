import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { createRestaurant } from '../../api/restaurants'
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

const steps = ['Details', 'Location', 'FSSAI', 'Review']

export default function RegisterRestaurant() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [position, setPosition] = useState(null)
  const [address, setAddress] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', city: 'Bhopal', fssai_number: '',
  })

  const handleSubmit = async () => {
    if (!position) { toast.error('Please select location on the map'); return }
    setLoading(true)
    try {
      await createRestaurant({
        name: form.name,
        address: address,
        city: form.city,
        lat: position[0],
        lng: position[1],
        phone: form.phone || undefined,
        fssai_number: form.fssai_number || undefined,
      })
      setSubmitted(true)
      toast.success('Restaurant registered!')
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card p-10">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-white mb-2">Restaurant Registered!</h2>
          <div className="inline-block px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold mb-4">
            ⏳ Pending Admin Approval
          </div>
          <p className="text-gray-400 text-sm mb-6">Your restaurant is under review. You'll be notified once approved.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Register Restaurant</h1>
      <p className="text-gray-500 mb-8">Add your restaurant to start donating surplus food</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i <= step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-red-500' : 'bg-gray-800'}`} />}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Restaurant Name *</label>
              <input type="text" className="input-field" placeholder="e.g. Manohar Dairy"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Phone</label>
              <input type="tel" className="input-field" placeholder="+91-XXXXX"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">City</label>
              <input type="text" className="input-field" value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Pin your restaurant on the map *</label>
            <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 350 }}>
              <MapContainer center={[23.2599, 77.4126]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapPicker position={position} setPosition={setPosition} setAddress={setAddress} />
              </MapContainer>
            </div>
            {address && <p className="text-sm text-gray-400">📍 {address}</p>}
            {position && <p className="text-xs text-gray-600">lat: {position[0].toFixed(5)}, lng: {position[1].toFixed(5)}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">FSSAI Number</label>
              <input type="text" className="input-field" placeholder="14-digit FSSAI number"
                value={form.fssai_number} onChange={e => setForm({ ...form, fssai_number: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Review Details</h3>
            {[
              ['Name', form.name],
              ['Phone', form.phone || '—'],
              ['City', form.city],
              ['Location', address || (position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'Not set')],
              ['FSSAI', form.fssai_number || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-800/50">
                <span className="text-gray-500 text-sm">{k}</span>
                <span className="text-gray-200 text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all text-sm">
              ← Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button onClick={() => {
              if (step === 0 && !form.name) { toast.error('Restaurant name required'); return }
              if (step === 1 && !position) { toast.error('Please pin location on map'); return }
              setStep(step + 1)
            }} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background: loading ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

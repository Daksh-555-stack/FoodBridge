import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { registerDriver } from '../../api/drivers'
import toast from 'react-hot-toast'

const vehicleTypes = [
  { value: 'bicycle', label: '🚲 Bicycle', capacity: 5, desc: 'Small packages' },
  { value: 'motorcycle', label: '🏍️ Motorcycle', capacity: 15, desc: 'Medium loads' },
  { value: 'auto', label: '🛺 Auto Rickshaw', capacity: 30, desc: 'Bulk food' },
  { value: 'car', label: '🚗 Car', capacity: 40, desc: 'Large orders' },
  { value: 'van', label: '🚐 Van', capacity: 100, desc: 'Maximum capacity' },
]

const steps = ['Vehicle Type', 'Details', 'Service Area', 'Review']

export default function DriverOnboarding() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const circleRef = useRef(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [position, setPosition] = useState({ lat: 23.2599, lng: 77.4126 })
  const [form, setForm] = useState({
    vehicle_type: 'motorcycle',
    vehicle_number: '',
    capacity_kg: 15,
    license_number: '',
    service_radius_km: 15,
  })

  // Get GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // Map for service area
  useEffect(() => {
    if (step !== 2 || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([position.lat, position.lng], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    L.marker([position.lat, position.lng]).addTo(map)

    const circle = L.circle([position.lat, position.lng], {
      radius: form.service_radius_km * 1000,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(map)
    circleRef.current = circle

    mapInstanceRef.current = map
    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [step])

  // Update circle when radius changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(form.service_radius_km * 1000)
    }
  }, [form.service_radius_km])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await registerDriver({
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number || undefined,
        capacity_kg: form.capacity_kg,
        license_number: form.license_number || undefined,
        service_radius_km: form.service_radius_km,
      })
      setSubmitted(true)
      toast.success('Driver profile registered!')
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl p-10" style={{ background: '#1c1c1c', border: '1px solid #333' }}>
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-white mb-2">Driver Profile Created!</h2>
          <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            ✅ Ready to Go
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Your driver profile is set up. Head to the dashboard and toggle your availability to start accepting deliveries.
          </p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <h1 className="text-3xl font-bold text-white mb-2">🚗 Driver Registration</h1>
      <p className="text-gray-500 mb-8">Set up your driver profile to start delivering rescued food</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? 'text-white' : 'text-gray-600'}`}
              style={{ background: i <= step ? '#10b981' : '#333' }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i <= step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-0.5" style={{ background: i < step ? '#10b981' : '#333' }} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: '#242424', border: '1px solid #333' }}>
        {/* Step 1: Vehicle Type */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Choose your vehicle type</h3>
            <div className="grid grid-cols-1 gap-3">
              {vehicleTypes.map(v => (
                <button key={v.value}
                  onClick={() => setForm({ ...form, vehicle_type: v.value, capacity_kg: v.capacity })}
                  className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: form.vehicle_type === v.value ? 'rgba(16,185,129,0.1)' : '#1c1c1c',
                    border: `2px solid ${form.vehicle_type === v.value ? '#10b981' : '#333'}`,
                  }}>
                  <span className="text-3xl">{v.label.split(' ')[0]}</span>
                  <div className="flex-1">
                    <div className="text-white font-semibold">{v.label.split(' ').slice(1).join(' ')}</div>
                    <div className="text-gray-500 text-xs">{v.desc} • Up to {v.capacity} kg</div>
                  </div>
                  {form.vehicle_type === v.value && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#10b981' }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-white mb-4">Vehicle & License Details</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vehicle Number Plate</label>
              <input type="text" className="input-field" placeholder="e.g. MP 04 XX 1234"
                value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Carrying Capacity (kg)</label>
              <input type="number" className="input-field" min={1} max={200}
                value={form.capacity_kg} onChange={e => setForm({ ...form, capacity_kg: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Driving License Number</label>
              <input type="text" className="input-field" placeholder="DL number"
                value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 3: Service Area */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-2">Set Your Delivery Radius</h3>
            <p className="text-gray-500 text-sm mb-4">Adjust the slider to set how far you're willing to deliver</p>
            <div ref={mapRef} className="rounded-xl overflow-hidden" style={{ height: 300, border: '1px solid #333' }} />
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Delivery radius</span>
                <span className="text-white font-bold">{form.service_radius_km} km</span>
              </div>
              <input type="range" min={5} max={50} step={1}
                value={form.service_radius_km}
                onChange={e => setForm({ ...form, service_radius_km: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #10b981 ${((form.service_radius_km - 5) / 45) * 100}%, #333 ${((form.service_radius_km - 5) / 45) * 100}%)` }} />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>5 km</span><span>50 km</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Review Your Profile</h3>
            {[
              ['Vehicle', `${vehicleTypes.find(v => v.value === form.vehicle_type)?.label || form.vehicle_type}`],
              ['Number Plate', form.vehicle_number || '—'],
              ['Capacity', `${form.capacity_kg} kg`],
              ['License', form.license_number || '—'],
              ['Service Radius', `${form.service_radius_km} km`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5" style={{ borderBottom: '1px solid #333' }}>
                <span className="text-gray-500 text-sm">{k}</span>
                <span className="text-white text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button onClick={() => { if (step === 2) { mapInstanceRef.current = null }; setStep(step - 1) }}
              className="px-5 py-2.5 rounded-xl text-gray-300 text-sm" style={{ background: '#333', border: '1px solid #444' }}>
              ← Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background: loading ? '#065f46' : 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}>
              {loading ? 'Submitting...' : '✅ Register as Driver'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

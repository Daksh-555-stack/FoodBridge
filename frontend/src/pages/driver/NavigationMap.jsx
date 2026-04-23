import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { getMyDeliveries, markPickedUp, markDelivered, updateDriverLocation } from '../../api/deliveries'
import ExpiryCountdown from '../../components/ExpiryCountdown'
import toast from 'react-hot-toast'

// CSS injected for pulsing driver marker
const markerCSS = `
  .driver-marker-dot {
    width: 20px; height: 20px; border-radius: 50%;
    background: #3b82f6; border: 3px solid white;
    box-shadow: 0 0 12px rgba(59,130,246,0.6);
    position: relative; z-index: 10;
  }
  .driver-marker-dot::after {
    content: ''; position: absolute; top: -6px; left: -6px;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(59,130,246,0.3);
    animation: driverPulse 1.5s ease-out infinite;
  }
  @keyframes driverPulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .success-overlay { animation: fadeInUp 0.5s ease-out; }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(40px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .checkmark-path {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: drawCheck 0.8s 0.3s ease-out forwards;
  }
  @keyframes drawCheck {
    to { stroke-dashoffset: 0; }
  }
`

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

// Custom icon factories
function createDriverIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="driver-marker-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function createPinIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px ${color}66;">
        <span style="transform:rotate(45deg);font-size:14px;color:white;font-weight:bold;">${label}</span>
      </div>
      <div style="width:6px;height:6px;border-radius:50%;background:${color};margin-top:2px;opacity:0.5;"></div>
    </div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  })
}

export default function NavigationMap() {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastSentRef = useRef(0)

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [driverPos, setDriverPos] = useState(null)
  const [phase, setPhase] = useState('pickup') // 'pickup' or 'dropoff'
  const [actionLoading, setActionLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [distToTarget, setDistToTarget] = useState(null)

  // Inject CSS
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = markerCSS
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // Fetch delivery
  const fetchDelivery = useCallback(async () => {
    try {
      const { data } = await getMyDeliveries()
      const d = data.find(dl => dl.id === deliveryId)
      if (d) {
        setDelivery(d)
        setPhase(d.status === 'picked_up' ? 'dropoff' : 'pickup')
      }
    } catch {} finally { setLoading(false) }
  }, [deliveryId])

  useEffect(() => { fetchDelivery() }, [fetchDelivery])

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setDriverPos({ lat: 23.2599, lng: 77.4126 })
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDriverPos(p)

        // Update marker
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([p.lat, p.lng])
        }

        // Send to backend every 15s
        if (Date.now() - lastSentRef.current > 15000) {
          updateDriverLocation(p).catch(() => {})
          lastSentRef.current = Date.now()
        }
      },
      () => setDriverPos({ lat: 23.2599, lng: 77.4126 }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // Calculate distance to target
  useEffect(() => {
    if (!driverPos || !delivery) return
    const target = phase === 'pickup'
      ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng }
      : { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }
    setDistToTarget(haversineKm(driverPos.lat, driverPos.lng, target.lat, target.lng))
  }, [driverPos, delivery, phase])

  // Initialize Leaflet map
  useEffect(() => {
    if (!delivery || !driverPos || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    // Driver marker
    const driverMkr = L.marker([driverPos.lat, driverPos.lng], {
      icon: createDriverIcon(),
      zIndexOffset: 1000,
    }).addTo(map)
    driverMarkerRef.current = driverMkr

    // Pickup marker
    const pickupMkr = L.marker([delivery.pickup_lat, delivery.pickup_lng], {
      icon: createPinIcon('#10b981', 'P'),
    }).addTo(map)
    pickupMkr.bindPopup(`
      <div style="min-width:180px;">
        <div style="color:#10b981;font-size:10px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">PICKUP POINT</div>
        <div style="font-weight:bold;font-size:14px;color:#111;">${delivery.claim?.listing?.restaurant?.name || 'Restaurant'}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">${delivery.pickup_address || ''}</div>
        ${delivery.claim?.listing?.restaurant?.phone ? `<a href="tel:${delivery.claim.listing.restaurant.phone}" style="color:#10b981;font-size:12px;margin-top:4px;display:block;">📞 ${delivery.claim.listing.restaurant.phone}</a>` : ''}
      </div>
    `)

    // Dropoff marker
    const dropoffMkr = L.marker([delivery.dropoff_lat, delivery.dropoff_lng], {
      icon: createPinIcon('#ef4444', 'D'),
    }).addTo(map)
    dropoffMkr.bindPopup(`
      <div style="min-width:180px;">
        <div style="color:#ef4444;font-size:10px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">DELIVERY POINT</div>
        <div style="font-weight:bold;font-size:14px;color:#111;">${delivery.claim?.shelter?.name || 'Shelter'}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">${delivery.dropoff_address || ''}</div>
        ${delivery.claim?.shelter?.phone ? `<a href="tel:${delivery.claim.shelter.phone}" style="color:#ef4444;font-size:12px;margin-top:4px;display:block;">📞 ${delivery.claim.shelter.phone}</a>` : ''}
      </div>
    `)

    // Open pickup popup by default if assigned
    if (delivery.status === 'assigned') pickupMkr.openPopup()

    // Fit bounds
    const bounds = L.latLngBounds([
      [driverPos.lat, driverPos.lng],
      [delivery.pickup_lat, delivery.pickup_lng],
      [delivery.dropoff_lat, delivery.dropoff_lng],
    ])
    map.fitBounds(bounds, { padding: [60, 60] })

    // Draw route
    drawRoute(map, delivery)

    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [delivery, driverPos ? 'ready' : 'waiting'])

  // Route polyline
  const drawRoute = (map, del) => {
    // Remove existing
    if (routeLayerRef.current) {
      routeLayerRef.current.forEach(l => map.removeLayer(l))
    }
    routeLayerRef.current = []

    const osrmRoute = del.osrm_route
    if (osrmRoute && osrmRoute.coordinates) {
      // osrm_route is a GeoJSON geometry object {type, coordinates}
      const coords = osrmRoute.coordinates.map(([lng, lat]) => [lat, lng])
      const line = L.polyline(coords, { color: '#10b981', weight: 5, opacity: 0.8 }).addTo(map)
      routeLayerRef.current.push(line)
    } else {
      // Fallback: dashed straight line
      const dashed = L.polyline(
        [[del.pickup_lat, del.pickup_lng], [del.dropoff_lat, del.dropoff_lng]],
        { color: '#10b981', weight: 3, dashArray: '10, 10', opacity: 0.6 }
      ).addTo(map)
      routeLayerRef.current.push(dashed)

      // Try to fetch from OSRM directly
      fetch(`https://router.project-osrm.org/route/v1/driving/${del.pickup_lng},${del.pickup_lat};${del.dropoff_lng},${del.dropoff_lat}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (data.routes?.[0]?.geometry?.coordinates) {
            map.removeLayer(dashed)
            routeLayerRef.current = routeLayerRef.current.filter(l => l !== dashed)
            const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
            const solid = L.polyline(coords, { color: '#10b981', weight: 5, opacity: 0.8 }).addTo(map)
            routeLayerRef.current.push(solid)
          }
        })
        .catch(() => {})
    }
  }

  // Handle Pickup
  const handlePickup = async () => {
    if (!delivery) return
    setActionLoading(true)
    try {
      await markPickedUp(delivery.id)
      toast.success('Pickup confirmed! Now deliver to shelter. 📦')
      setPhase('dropoff')
      setDelivery(d => d ? { ...d, status: 'picked_up' } : d)
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  // Handle Deliver
  const handleDeliver = async () => {
    if (!delivery) return
    setActionLoading(true)
    try {
      await markDelivered(delivery.id)
      setCompleted(true)
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  // ETA calculation
  const eta = distToTarget ? Math.ceil(parseFloat(distToTarget) / 30 * 60) : null

  // ═══ Completed overlay ═══
  if (completed) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
        <div className="text-center success-overlay">
          {/* Animated checkmark */}
          <div className="mb-6">
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: '0 auto' }}>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="4" opacity="0.3" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="4"
                strokeDasharray="340" strokeDashoffset="340"
                style={{ animation: 'drawCircle 0.6s ease-out forwards' }} />
              <path d="M36 60 L52 76 L84 44" fill="none" stroke="#10b981" strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round" className="checkmark-path" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Delivery Complete!</h2>
          <p className="text-xl text-green-400 font-semibold mb-1">
            You rescued {delivery?.claim?.listing?.quantity_kg || '?'} kg of food
          </p>
          <p className="text-gray-400 text-sm mb-8">Thank you for making a difference 💚</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-8 py-3.5 rounded-xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 25px rgba(16,185,129,0.4)' }}>
            Back to Dashboard
          </button>
        </div>
        <style>{`
          @keyframes drawCircle {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    )
  }

  // ═══ Loading ═══
  if (loading || !delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1c1c1c' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading navigation...</p>
        </div>
      </div>
    )
  }

  const targetLabel = phase === 'pickup' ? 'HEAD TO PICKUP' : 'DELIVER TO SHELTER'
  const targetName = phase === 'pickup'
    ? (delivery.claim?.listing?.restaurant?.name || 'Restaurant')
    : (delivery.claim?.shelter?.name || 'Shelter')
  const targetAddress = phase === 'pickup' ? delivery.pickup_address : delivery.dropoff_address

  return (
    <div className="fixed inset-0 top-16 flex flex-col" style={{ background: '#1c1c1c' }}>
      {/* Map container */}
      <div ref={mapRef} className="flex-1" style={{ minHeight: 0 }} />

      {/* Bottom info panel */}
      <div style={{ background: '#1c1c1c', borderTop: '1px solid #333' }}>
        {/* Phase indicator bar */}
        <div className="px-4 py-2" style={{ background: phase === 'pickup' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', borderBottom: '1px solid #333' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: phase === 'pickup' ? '#10b981' : '#f59e0b' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: phase === 'pickup' ? '#10b981' : '#f59e0b' }}>
              {targetLabel}
            </span>
          </div>
        </div>

        {/* Info content */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{targetName}</h3>
            <p className="text-gray-500 text-sm truncate">{targetAddress || 'See map for location'}</p>
            {delivery.claim?.listing?.expiry_time && (
              <div className="mt-1">
                <ExpiryCountdown expiryDatetime={delivery.claim.listing.expiry_time} />
              </div>
            )}
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            {distToTarget && (
              <>
                <div className="text-white font-bold text-xl">{distToTarget} km</div>
                <div className="text-gray-500 text-xs">~{eta} min</div>
              </>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="px-4 pb-4">
          {phase === 'pickup' ? (
            <button onClick={handlePickup} disabled={actionLoading}
              className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 25px rgba(16,185,129,0.4)' }}>
              {actionLoading ? (
                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Confirming...</>
              ) : '📦 Mark as Picked Up'}
            </button>
          ) : (
            <button onClick={handleDeliver} disabled={actionLoading}
              className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 25px rgba(245,158,11,0.4)' }}>
              {actionLoading ? (
                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Confirming...</>
              ) : '✅ Mark as Delivered'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ExpiryCountdown from '../components/ExpiryCountdown'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BHOPAL_CENTER = [23.2599, 77.4126]

const createIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, ${color}CC, ${color});
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; box-shadow: 0 4px 12px ${color}66;
      border: 2px solid rgba(255,255,255,0.3);
      animation: pulse 2s infinite;
    ">${emoji}</div>
    <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

const donorIcon = createIcon('#22c55e', '🍲')
const driverIcon = createIcon('#3b82f6', '🚗')
const shelterIcon = createIcon('#ef4444', '🏠')

export default function MapView() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const polylinesRef = useRef([])
  const { state } = useApp()
  const [selectedPin, setSelectedPin] = useState(null)

  // Fetch data
  const { data: donations = [] } = useQuery({
    queryKey: ['donations-map'],
    queryFn: async () => {
      const { data } = await api.get('/donations')
      return data
    },
    refetchInterval: 15000,
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-map'],
    queryFn: async () => {
      const { data } = await api.get('/drivers/available')
      return data
    },
    refetchInterval: 10000,
  })

  const { data: shelters = [] } = useQuery({
    queryKey: ['shelters-map'],
    queryFn: async () => {
      const { data } = await api.get('/shelters')
      return data
    },
    refetchInterval: 30000,
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['matches-map'],
    queryFn: async () => {
      const { data } = await api.get('/matches')
      return data
    },
    refetchInterval: 15000,
  })

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(BHOPAL_CENTER, 13)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    // Donor pins (green) — from active donations
    const pendingDonations = donations.filter(d => ['pending', 'matched', 'in_transit'].includes(d.status))
    pendingDonations.forEach(d => {
      const marker = L.marker([d.pickup_lat, d.pickup_lng], { icon: donorIcon })
        .addTo(map)
        .bindPopup(`
          <div style="color:#111;min-width:180px">
            <h3 style="font-weight:700;font-size:14px;margin:0 0 4px">🍲 ${d.food_type}</h3>
            <p style="margin:2px 0;font-size:12px"><b>Quantity:</b> ${d.quantity_kg} kg</p>
            <p style="margin:2px 0;font-size:12px"><b>Status:</b> ${d.status}</p>
            <p style="margin:2px 0;font-size:12px"><b>Expiry:</b> ${new Date(d.expiry_datetime).toLocaleString()}</p>
          </div>
        `)
      markersRef.current[`donation-${d.id}`] = marker
    })

    // Driver pins (blue)
    drivers.forEach(d => {
      if (!d.current_lat || !d.current_lng) return
      const marker = L.marker([d.current_lat, d.current_lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup(`
          <div style="color:#111;min-width:180px">
            <h3 style="font-weight:700;font-size:14px;margin:0 0 4px">🚗 ${d.user?.name || 'Driver'}</h3>
            <p style="margin:2px 0;font-size:12px"><b>Capacity:</b> ${d.vehicle_capacity_kg} kg</p>
            <p style="margin:2px 0;font-size:12px"><b>Available:</b> ${d.is_available ? '✅ Yes' : '❌ On route'}</p>
          </div>
        `)
      markersRef.current[`driver-${d.id}`] = marker
    })

    // Shelter pins (red)
    shelters.forEach(s => {
      const remaining = s.capacity_kg - s.current_load_kg
      const pct = ((s.current_load_kg / s.capacity_kg) * 100).toFixed(0)
      const marker = L.marker([s.lat, s.lng], { icon: shelterIcon })
        .addTo(map)
        .bindPopup(`
          <div style="color:#111;min-width:180px">
            <h3 style="font-weight:700;font-size:14px;margin:0 0 4px">🏠 ${s.user?.name || 'Shelter'}</h3>
            <p style="margin:2px 0;font-size:12px"><b>Capacity:</b> ${pct}% used (${s.current_load_kg}/${s.capacity_kg} kg)</p>
            <p style="margin:2px 0;font-size:12px"><b>Remaining:</b> ${remaining.toFixed(1)} kg</p>
            <p style="margin:2px 0;font-size:12px"><b>Address:</b> ${s.address || '—'}</p>
          </div>
        `)
      markersRef.current[`shelter-${s.id}`] = marker
    })
  }, [donations, drivers, shelters])

  // Update driver locations from WebSocket
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    Object.entries(state.driverLocations).forEach(([driverId, loc]) => {
      const key = `driver-${driverId}`
      const existing = markersRef.current[key]
      if (existing) {
        // Smooth animation to new position
        const latlng = L.latLng(loc.lat, loc.lng)
        existing.setLatLng(latlng)
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`<div style="color:#111"><b>🚗 ${loc.name || 'Driver'}</b></div>`)
        markersRef.current[key] = marker
      }
    })
  }, [state.driverLocations])

  // Draw route polylines
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old polylines
    polylinesRef.current.forEach(p => map.removeLayer(p))
    polylinesRef.current = []

    // Draw from routes in state
    Object.values(state.routes).forEach(route => {
      if (route.polyline_coords && route.polyline_coords.length > 1) {
        const polyline = L.polyline(route.polyline_coords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10 6',
        }).addTo(map)
        polylinesRef.current.push(polyline)
      }
    })

    // Also draw from matches/routes data
    matches.forEach(m => {
      if (m.route?.polyline_coords) {
        const polyline = L.polyline(m.route.polyline_coords, {
          color: '#22c55e',
          weight: 3,
          opacity: 0.6,
          dashArray: '8 4',
        }).addTo(map)
        polylinesRef.current.push(polyline)
      }
    })
  }, [state.routes, matches])

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] glass-card p-4 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Map Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500" />
            <span className="text-gray-400">Donors ({donations.filter(d => d.status !== 'delivered' && d.status !== 'expired').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500" />
            <span className="text-gray-400">Drivers ({drivers.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-gray-400">Shelters ({shelters.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-blue-500 rounded" />
            <span className="text-gray-400">Routes</span>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex gap-3 overflow-x-auto pb-2">
        <div className="glass-card px-4 py-3 rounded-xl flex-shrink-0">
          <div className="text-xs text-gray-500">Active Donations</div>
          <div className="text-lg font-bold text-emerald-400">{donations.filter(d => d.status === 'pending').length}</div>
        </div>
        <div className="glass-card px-4 py-3 rounded-xl flex-shrink-0">
          <div className="text-xs text-gray-500">Drivers Online</div>
          <div className="text-lg font-bold text-blue-400">{drivers.length}</div>
        </div>
        <div className="glass-card px-4 py-3 rounded-xl flex-shrink-0">
          <div className="text-xs text-gray-500">Matches Today</div>
          <div className="text-lg font-bold text-purple-400">{matches.length}</div>
        </div>
        <div className="glass-card px-4 py-3 rounded-xl flex-shrink-0">
          <div className="text-xs text-gray-500">Shelters</div>
          <div className="text-lg font-bold text-red-400">{shelters.length}</div>
        </div>
      </div>
    </div>
  )
}

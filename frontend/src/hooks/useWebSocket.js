import { useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import toast from 'react-hot-toast'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
const MAX_RETRIES = 10

export function useWebSocket() {
  const { state, dispatch } = useApp()
  const wsRef = useRef(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef(null)

  const handleMessage = useCallback((message) => {
    const { event, data } = message

    switch (event) {
      case 'new_listing':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'new_listing', data } })
        toast.success(`🍲 New food available: ${data?.food_name || 'Food listed'}`, { duration: 5000 })
        break

      case 'new_claim':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'new_claim', data } })
        toast('📦 New delivery job available!', { icon: '🚗', duration: 5000 })
        break

      case 'delivery_assigned':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'delivery_assigned', data } })
        toast.success('🚗 A driver is on the way!', { duration: 5000 })
        break

      case 'food_picked_up':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'food_picked_up', data } })
        toast.success('📦 Driver picked up your food!', { duration: 5000 })
        break

      case 'food_delivered':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'food_delivered', data } })
        toast.success('🎉 Food delivered successfully!', { duration: 6000 })
        break

      case 'driver_location':
        dispatch({ type: 'UPDATE_DRIVER_LOCATION', payload: data })
        break

      case 'expiry_alert':
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'expiry_alert', data } })
        toast.error(`⏰ ${data?.food_name || 'Food'} expiring in ${data?.remaining_minutes || '?'} min!`, { duration: 6000 })
        break

      default:
        console.log('Unknown WS event:', event)
    }
  }, [dispatch])

  const connect = useCallback(() => {
    if (!state.user || !state.accessToken) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `${WS_URL}/ws/${state.user.id}?token=${state.accessToken}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        retriesRef.current = 0
      }

      ws.onmessage = (event) => {
        if (event.data === 'ping') { ws.send('pong'); return }
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch { /* not JSON */ }
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        attemptReconnect()
      }

      ws.onerror = () => {}
    } catch {
      attemptReconnect()
    }
  }, [state.user, state.accessToken, handleMessage])

  const attemptReconnect = useCallback(() => {
    if (retriesRef.current >= MAX_RETRIES) return
    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000)
    retriesRef.current += 1
    reconnectTimerRef.current = setTimeout(connect, delay)
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect])

  return { isConnected: wsRef.current?.readyState === WebSocket.OPEN }
}

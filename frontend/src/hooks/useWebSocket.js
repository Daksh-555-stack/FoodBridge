import { useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import toast from 'react-hot-toast'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
const MAX_RETRIES = 5

export function useWebSocket() {
  const { state, dispatch } = useApp()
  const wsRef = useRef(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef(null)

  const connect = useCallback(() => {
    if (!state.user || !state.accessToken) return

    const url = `${WS_URL}/ws/${state.user.id}?token=${state.accessToken}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        retriesRef.current = 0
      }

      ws.onmessage = (event) => {
        if (event.data === 'ping') {
          ws.send('pong')
          return
        }

        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (e) {
          // Not JSON, might be pong
        }
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        attemptReconnect()
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (e) {
      console.error('WebSocket connection failed:', e)
      attemptReconnect()
    }
  }, [state.user, state.accessToken])

  const attemptReconnect = useCallback(() => {
    if (retriesRef.current >= MAX_RETRIES) {
      console.log('Max WebSocket retries reached')
      return
    }
    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000)
    retriesRef.current += 1
    console.log(`Reconnecting in ${delay}ms (attempt ${retriesRef.current})`)
    reconnectTimerRef.current = setTimeout(connect, delay)
  }, [connect])

  const handleMessage = useCallback((message) => {
    const { event, payload } = message

    switch (event) {
      case 'new_match':
        dispatch({ type: 'ADD_MATCH', payload })
        toast.success(`🎯 New match! Confidence: ${(payload.confidence_score * 100).toFixed(0)}%`, {
          duration: 5000,
          icon: '🍲',
        })
        break

      case 'driver_location':
        dispatch({ type: 'UPDATE_DRIVER_LOCATION', payload })
        break

      case 'route_updated':
        dispatch({ type: 'UPDATE_ROUTE', payload })
        break

      case 'delivery_done':
        dispatch({ type: 'DELIVERY_DONE', payload })
        toast.success(`✅ Delivery completed! ${payload.quantity_kg}kg rescued`, {
          duration: 5000,
          icon: '🎉',
        })
        break

      case 'expiry_alert':
        dispatch({ type: 'EXPIRY_ALERT', payload })
        toast.error(`⚠️ ${payload.food_type} expiring in ${payload.remaining_minutes} min!`, {
          duration: 6000,
          icon: '⏰',
        })
        break

      default:
        console.log('Unknown WS event:', event)
    }
  }, [dispatch])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect])

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
  }, [])

  return { sendMessage, isConnected: wsRef.current?.readyState === WebSocket.OPEN }
}

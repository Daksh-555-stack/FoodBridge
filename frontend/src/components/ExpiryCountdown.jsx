import { useState, useEffect } from 'react'

export default function ExpiryCountdown({ expiryDatetime }) {
  const [remaining, setRemaining] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isCritical, setIsCritical] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const expiry = new Date(expiryDatetime)
      const diffMs = expiry - now

      if (diffMs <= 0) {
        setRemaining('EXPIRED')
        setIsCritical(true)
        return
      }

      const hours = Math.floor(diffMs / 3600000)
      const mins = Math.floor((diffMs % 3600000) / 60000)
      const secs = Math.floor((diffMs % 60000) / 1000)

      if (hours > 0) {
        setRemaining(`${hours}h ${mins}m ${secs}s`)
      } else {
        setRemaining(`${mins}m ${secs}s`)
      }

      setIsUrgent(diffMs < 3600000)  // < 1 hour
      setIsCritical(diffMs < 1800000) // < 30 min
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiryDatetime])

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold ${
      isCritical ? 'text-red-400 animate-pulse' :
      isUrgent ? 'text-amber-400' :
      'text-gray-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        isCritical ? 'bg-red-500 animate-ping' :
        isUrgent ? 'bg-amber-500' :
        'bg-green-500'
      }`} style={{ animationDuration: isCritical ? '1s' : '0s' }} />
      {remaining}
    </span>
  )
}

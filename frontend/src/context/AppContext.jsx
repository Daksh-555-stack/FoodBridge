import { createContext, useContext, useReducer, useEffect } from 'react'

const AppContext = createContext(null)

const initialState = {
  user: JSON.parse(localStorage.getItem('fb_user') || 'null'),
  accessToken: localStorage.getItem('fb_access_token') || null,
  refreshToken: localStorage.getItem('fb_refresh_token') || null,
  driverLocations: {},
  notifications: [],
  unreadCount: 0,
  darkMode: true,
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      localStorage.setItem('fb_user', JSON.stringify(action.payload.user))
      localStorage.setItem('fb_access_token', action.payload.accessToken)
      localStorage.setItem('fb_refresh_token', action.payload.refreshToken)
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      }

    case 'LOGOUT':
      localStorage.removeItem('fb_user')
      localStorage.removeItem('fb_access_token')
      localStorage.removeItem('fb_refresh_token')
      return { ...initialState, user: null, accessToken: null, refreshToken: null }

    case 'UPDATE_DRIVER_LOCATION':
      return {
        ...state,
        driverLocations: {
          ...state.driverLocations,
          [action.payload.driver_id]: {
            lat: action.payload.lat,
            lng: action.payload.lng,
            name: action.payload.name,
          },
        },
      }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          { id: Date.now(), ...action.payload, read: false, timestamp: new Date().toISOString() },
          ...state.notifications,
        ].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }

    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [state.darkMode])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

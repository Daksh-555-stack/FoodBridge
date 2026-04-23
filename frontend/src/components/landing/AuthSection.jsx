import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import api from '../../api/client'

function extractErrorMessage(err) {
  console.error('Auth error full response:', err.response?.data)

  const data = err.response?.data
  let message = ''

  if (!data) {
    message = 'Cannot connect to server. Is the backend running?'
  } else if (typeof data === 'string') {
    message = data
  } else if (typeof data.detail === 'string') {
    message = data.detail
  } else if (Array.isArray(data.detail)) {
    message = data.detail
      .map((e) => {
        if (typeof e === 'string') return e
        if (typeof e === 'object' && e?.msg) {
          const field = e.loc ? e.loc[e.loc.length - 1] : ''
          return field ? `${field}: ${e.msg}` : e.msg
        }
        return JSON.stringify(e)
      })
      .join('. ')
  } else if (typeof data.message === 'string') {
    message = data.message
  } else if (typeof data.error === 'string') {
    message = data.error
  } else {
    message = JSON.stringify(data)
  }

  return message || 'Something went wrong. Please try again.'
}

export default function AuthSection() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'donor',
  })
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })

  const routeForRole = (role) => {
    if (role === 'admin') return '/admin'
    if (role === 'donor') return '/dashboard'
    if (role === 'shelter') return '/shelter/dashboard'
    if (role === 'driver') return '/driver/dashboard'
    return '/dashboard'
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', signupData)
      localStorage.setItem('foodbridge_token', res.data.access_token)
      if (res.data.access_token) {
        localStorage.setItem('fb_access_token', res.data.access_token)
      }
      if (res.data.refresh_token) {
        localStorage.setItem('fb_refresh_token', res.data.refresh_token)
      }

      const user = res.data.user || { ...signupData }
      dispatch({
        type: 'SET_AUTH',
        payload: {
          user,
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token || '',
        },
      })

      navigate(routeForRole(user.role || signupData.role))
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', {
        email: loginData.email,
        password: loginData.password,
      })

      localStorage.setItem('foodbridge_token', res.data.access_token)
      if (res.data.access_token) {
        localStorage.setItem('fb_access_token', res.data.access_token)
      }
      if (res.data.refresh_token) {
        localStorage.setItem('fb_refresh_token', res.data.refresh_token)
      }

      const meRes = await api.get('/api/auth/me')
      const user = meRes.data
      dispatch({
        type: 'SET_AUTH',
        payload: {
          user,
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token || '',
        },
      })

      navigate(routeForRole(user.role))
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#1c1c1c',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
    boxSizing: 'border-box',
  }

  const cardStyle = {
    background: '#1e1e1e',
    border: '1px solid #2e2e2e',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          marginBottom: '28px',
          borderBottom: '1px solid #2e2e2e',
        }}
      >
        {['signup', 'login'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError('')
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: 'none',
              color: tab === t ? '#10b981' : '#666',
              borderBottom: tab === t
                ? '2px solid #10b981'
                : '2px solid transparent',
              fontSize: '14px',
              fontWeight: tab === t ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        ))}
      </div>

      {error && typeof error === 'string' && error.length > 0 && (
        <div
          style={{
            background: '#2a1515',
            border: '1px solid #e74c3c',
            color: '#e74c3c',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '13px',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          {error}
        </div>
      )}

      {tab === 'signup' ? (
        <form onSubmit={handleSignup}>
          <input
            style={inputStyle}
            placeholder="Full Name"
            value={signupData.name}
            onChange={(e) => setSignupData({
              ...signupData,
              name: e.target.value,
            })}
            required
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={signupData.email}
            onChange={(e) => setSignupData({
              ...signupData,
              email: e.target.value,
            })}
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password (min 8 characters)"
            value={signupData.password}
            onChange={(e) => setSignupData({
              ...signupData,
              password: e.target.value,
            })}
            required
            minLength={8}
          />
          <div style={{ marginBottom: '20px' }}>
            <p
              style={{
                color: '#888',
                fontSize: '12px',
                marginBottom: '10px',
              }}
            >
              I am a...
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 'donor', label: 'Restaurant' },
                { value: 'driver', label: 'Driver' },
                { value: 'shelter', label: 'Shelter' },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSignupData({
                    ...signupData,
                    role: role.value,
                  })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: signupData.role === role.value
                      ? '#10b981'
                      : 'transparent',
                    border: `1px solid ${
                      signupData.role === role.value ? '#10b981' : '#333'
                    }`,
                    color: signupData.role === role.value
                      ? '#fff'
                      : '#888',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#0a7a52' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={loginData.email}
            onChange={(e) => setLoginData({
              ...loginData,
              email: e.target.value,
            })}
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={loginData.password}
            onChange={(e) => setLoginData({
              ...loginData,
              password: e.target.value,
            })}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#0a7a52' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      )}
    </div>
  )
}

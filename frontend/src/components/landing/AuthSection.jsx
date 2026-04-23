import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function AuthSection() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signup')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'donor',
  })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  const routeAfterAuth = (user) => {
    if (user.is_approved === false && user.role !== 'admin') return '/pending-approval'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'donor') return '/dashboard'
    if (user.role === 'shelter') return '/shelter/dashboard'
    if (user.role === 'driver') return '/driver/dashboard'
    return '/dashboard'
  }

  const validate = () => {
    if (mode === 'signup') {
      if (!form.name || form.name.length < 2) return 'Name must be at least 2 characters'
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email'
      if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters'
    } else {
      if (!form.email) return 'Email is required'
      if (!form.password) return 'Password is required'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError('')
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const payload = mode === 'signup'
        ? { name: form.name, email: form.email, password: form.password, role: form.role }
        : { email: form.email, password: form.password }
      const { data } = await api.post(endpoint, payload)
      dispatch({
        type: 'SET_AUTH',
        payload: {
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        },
      })
      toast.success(`Welcome, ${data.user.name}! 🎉`)
      navigate(routeAfterAuth(data.user))
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = detail?.message || (typeof detail === 'string' ? detail : 'Authentication failed')
      setError(msg)
      // Shake animation on error
      const card = document.querySelector('.auth-card')
      if (card) {
        card.style.animation = 'formShake 0.5s ease'
        setTimeout(() => { card.style.animation = '' }, 500)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      const { data } = await api.get('/api/auth/google/login')
      if (data.url) window.location.href = data.url
    } catch { setError('Google login is currently unavailable') }
  }

  const roles = [
    { value: 'donor',   label: 'Restaurant / Donor', icon: '🍲' },
    { value: 'driver',  label: 'Delivery Driver',    icon: '🚗' },
    { value: 'shelter', label: 'Shelter Manager',    icon: '🏠' },
  ]

  return (
    <div className="auth-card">
      {/* Tab Switcher */}
      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setError('') }}
        >Sign Up</button>
        <button
          className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => { setMode('signin'); setError('') }}
        >Sign In</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Name — signup only */}
        {mode === 'signup' && (
          <div className="auth-field">
            <label htmlFor="auth-name">Full Name</label>
            <input
              id="auth-name"
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              aria-label="Full name"
            />
          </div>
        )}

        {/* Email */}
        <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            aria-label="Email address"
          />
        </div>

        {/* Password */}
        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <div className="password-wrapper">
            <input
              id="auth-password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              aria-label="Password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPw(p => !p)}
              aria-label="Toggle password visibility"
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Role — signup only */}
        {mode === 'signup' && (
          <div className="auth-field">
            <label>I am a…</label>
            <div className="role-cards">
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`role-card ${form.role === r.value ? `selected-${r.value}` : ''}`}
                  onClick={() => set('role', r.value)}
                  aria-label={r.label}
                >
                  <span style={{ fontSize: '1.15rem' }}>{r.icon}</span>
                  <br />{r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading && (
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
            </svg>
          )}
          {loading
            ? (mode === 'signup' ? 'Creating Account…' : 'Signing In…')
            : (mode === 'signup' ? 'Create Account' : 'Sign In')
          }
        </button>
      </form>

      {/* Error message */}
      {error && <div className="auth-error">{error}</div>}

      {/* Sign-in extras */}
      {mode === 'signin' && (
        <>
          <button className="forgot-link" type="button">Forgot password?</button>
          <div className="auth-divider"><span>or</span></div>
          <button type="button" className="google-btn" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  )
}

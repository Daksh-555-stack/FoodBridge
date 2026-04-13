import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Login() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'donor',
    lat: 23.2599,
    lng: 77.4126,
  })

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const payload = isRegister ? form : { email: form.email, password: form.password }
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
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail?.error || err.response?.data?.detail || 'Authentication failed'
      toast.error(typeof msg === 'string' ? msg : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-black relative overflow-hidden">

      {/* ── Animated background grid ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(220,38,38,0.07) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(220,38,38,0.07) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Glow orbs ── */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(185,28,28,0.15) 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 60%)' }} />

      {/* ── Left panel — hero text ── */}
      <div className={`hidden lg:flex flex-col justify-center px-16 w-1/2 relative transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>

        {/* Logo mark */}
        <div className="mb-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', boxShadow: '0 0 40px rgba(220,38,38,0.5)' }}>
            F
          </div>
          <span className="text-white font-bold text-xl tracking-tight">FoodBridge AI</span>
        </div>

        <h1 className="text-6xl font-black text-white leading-tight mb-6">
          Rescue Food.<br />
          <span style={{ background: 'linear-gradient(90deg, #ef4444, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Feed Hope.
          </span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed max-w-md">
          AI-powered logistics that matches surplus food from restaurants with nearby shelters — in real time, every night.
        </p>

        {/* Stats row */}
        <div className="flex gap-8 mt-12">
          {[
            { label: 'Food Rescued', value: '2.4T', unit: 'kg' },
            { label: 'Shelters Served', value: '127', unit: '+' },
            { label: 'Avg Match Time', value: '< 90', unit: 's' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black" style={{ color: '#ef4444' }}>
                {s.value}<span className="text-xl">{s.unit}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Decorative role pills */}
        <div className="flex gap-3 mt-12 flex-wrap">
          {[
            { label: 'Donors', color: '#22c55e' },
            { label: 'Drivers', color: '#3b82f6' },
            { label: 'Shelters', color: '#ef4444' },
            { label: 'AI Engine', color: '#f59e0b' },
          ].map(r => (
            <span key={r.label} className="px-4 py-1.5 rounded-full text-xs font-semibold border text-white/70"
              style={{ borderColor: r.color + '40', background: r.color + '15', color: r.color }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className={`flex flex-col justify-center items-center w-full lg:w-1/2 px-6 py-12 relative transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>

        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white text-3xl font-black mb-3"
            style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', boxShadow: '0 0 30px rgba(220,38,38,0.4)' }}>
            F
          </div>
          <h1 className="text-3xl font-black text-white">FoodBridge AI</h1>
          <p className="text-gray-500 text-sm mt-1">Rescuing food, feeding hope</p>
        </div>

        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl p-8 relative"
            style={{
              background: 'rgba(10,10,10,0.85)',
              border: '1px solid rgba(220,38,38,0.2)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 60px rgba(220,38,38,0.1), 0 32px 64px rgba(0,0,0,0.6)',
            }}>

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-tl-3xl rounded-br-3xl overflow-hidden pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), transparent)' }} />

            <h2 className="text-2xl font-bold text-white mb-1">
              {isRegister ? 'Create Account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {isRegister ? 'Join the food rescue network' : 'Sign in to your account'}
            </p>

            {/* Toggle */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {['Sign In', 'Register'].map((label, i) => (
                <button key={label}
                  onClick={() => setIsRegister(i === 1)}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
                  style={isRegister === (i === 1) ? {
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
                  } : { color: '#6b7280' }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input id="register-name" type="text"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm outline-none transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    placeholder="Enter your name" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required={isRegister} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                <input id="login-email" type="email"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm outline-none transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="you@example.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                <input id="login-password" type="password"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm outline-none transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Role</label>
                  <select id="register-role"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="donor" className="bg-gray-900">🍲 Food Donor</option>
                    <option value="driver" className="bg-gray-900">🚗 Delivery Driver</option>
                    <option value="shelter" className="bg-gray-900">🏠 Shelter Manager</option>
                  </select>
                </div>
              )}

              {/* Submit */}
              <button id="login-submit" type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                style={{
                  background: loading ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  boxShadow: loading ? 'none' : '0 0 30px rgba(220,38,38,0.5), 0 4px 20px rgba(0,0,0,0.4)',
                  transform: loading ? 'scale(0.98)' : 'scale(1)',
                }}
                onMouseEnter={e => { if (!loading) e.target.style.boxShadow = '0 0 40px rgba(220,38,38,0.7), 0 4px 24px rgba(0,0,0,0.5)' }}
                onMouseLeave={e => { if (!loading) e.target.style.boxShadow = '0 0 30px rgba(220,38,38,0.5), 0 4px 20px rgba(0,0,0,0.4)' }}>
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Authenticating...' : isRegister ? '→ Create Account' : '→ Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-xs text-gray-600 uppercase tracking-wider">quick access</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Demo credentials */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '⚙️ Admin', email: 'admin@foodbridge.ai', color: '#f59e0b' },
                { label: '🍲 Donor', email: 'manohar@foodbridge.ai', color: '#22c55e' },
                { label: '🚗 Driver', email: 'rajesh@foodbridge.ai', color: '#3b82f6' },
                { label: '🏠 Shelter', email: 'children@foodbridge.ai', color: '#ef4444' },
              ].map(cred => (
                <button key={cred.label}
                  onClick={() => { setIsRegister(false); setForm({ ...form, email: cred.email, password: 'foodbridge123' }) }}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 text-left"
                  style={{
                    border: `1px solid ${cred.color}30`,
                    background: `${cred.color}10`,
                    color: cred.color,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${cred.color}20`; e.currentTarget.style.borderColor = `${cred.color}50` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${cred.color}10`; e.currentTarget.style.borderColor = `${cred.color}30` }}>
                  {cred.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-600 mt-3">All passwords: <span className="text-gray-500 font-mono">foodbridge123</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}

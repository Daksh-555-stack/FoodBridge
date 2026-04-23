import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function PendingApprovalPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const user = state.user || JSON.parse(localStorage.getItem('fb_user') || 'null')

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1c1c1c',
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        textAlign: 'center',
        border: '1px solid #333',
        borderRadius: 8,
        background: '#242424',
        padding: '42px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true">
            <circle cx="46" cy="46" r="36" stroke="#f59e0b" strokeWidth="6" />
            <path d="M46 22v24l15 10" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 11h44M24 81h44" stroke="#555" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>

        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '0 0 12px', fontWeight: 900 }}>
          Your account is under review
        </h1>
        <p style={{ color: '#c7c7c7', fontSize: 16, lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 460 }}>
          Our admin team will approve your account within 24 hours.
          You will be able to access your dashboard after approval.
        </p>

        <div style={{
          textAlign: 'left',
          border: '1px solid #333',
          borderRadius: 8,
          background: '#1c1c1c',
          padding: 18,
          marginBottom: 26,
        }}>
          <div style={{ color: '#8f8f8f', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>
            Your registered details
          </div>
          <DetailRow label="Name" value={user?.name || 'N/A'} />
          <DetailRow label="Email" value={user?.email || 'N/A'} />
          <DetailRow label="Role" value={user?.role || 'N/A'} />
        </div>

        <button
          onClick={logout}
          style={{
            border: 0,
            borderRadius: 8,
            background: '#dc2626',
            color: '#fff',
            padding: '12px 18px',
            fontWeight: 800,
            cursor: 'pointer',
            minWidth: 120,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '9px 0', borderTop: '1px solid #2e2e2e' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 700, textTransform: label === 'Role' ? 'capitalize' : 'none', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

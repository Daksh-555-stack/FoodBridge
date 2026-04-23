import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useApp } from '../context/AppContext'

const navItems = ['Overview', 'Pending Approvals', 'Restaurants', 'All Users', 'Food Listings', 'Deliveries']

const roleColors = {
  donor: { bg: '#123524', color: '#4ade80', label: 'DONOR' },
  shelter: { bg: '#102a43', color: '#60a5fa', label: 'SHELTER' },
  driver: { bg: '#3a2808', color: '#fbbf24', label: 'DRIVER' },
  admin: { bg: '#2d2338', color: '#c084fc', label: 'ADMIN' },
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'adminSpin 0.8s linear infinite',
      }}
    />
  )
}

function formatDate(value) {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function RoleBadge({ role }) {
  const colors = roleColors[role] || roleColors.admin
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 999,
      padding: '4px 9px',
      background: colors.bg,
      color: colors.color,
      fontSize: 11,
      fontWeight: 800,
    }}>
      {colors.label}
    </span>
  )
}

function StatusBadge({ user }) {
  if (!user.is_active) {
    return <span style={badgeStyle('#3a1414', '#f87171')}>Suspended</span>
  }
  if (user.is_approved) {
    return <span style={badgeStyle('#123524', '#4ade80')}>Approved</span>
  }
  return <span style={badgeStyle('#3a2808', '#fbbf24')}>Pending</span>
}

function RestaurantStatusBadge({ status }) {
  if (status === 'approved') {
    return <span style={badgeStyle('#123524', '#4ade80')}>Approved</span>
  }
  if (status === 'rejected') {
    return <span style={badgeStyle('#3a1414', '#f87171')}>Rejected</span>
  }
  return <span style={badgeStyle('#3a2808', '#fbbf24')}>Pending</span>
}

function badgeStyle(bg, color) {
  return {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '4px 9px',
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 700,
  }
}

function pendingDetails(user) {
  if (user.role === 'donor') {
    return user.restaurant
      ? `${user.restaurant.name} - ${user.restaurant.address}`
      : 'Restaurant details not submitted'
  }
  if (user.role === 'shelter') {
    return user.shelter
      ? `${user.shelter.name} - ${user.shelter.address}`
      : 'Shelter details not submitted'
  }
  if (user.role === 'driver') {
    return user.driver
      ? `${user.driver.vehicle_type || 'Vehicle'} - ${user.driver.vehicle_number || 'No number'}`
      : 'Driver details not submitted'
  }
  return 'N/A'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const [active, setActive] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [pending, setPending] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [restaurantFilter, setRestaurantFilter] = useState('pending')
  const [pendingRestaurantCount, setPendingRestaurantCount] = useState(0)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState({ stats: false, pending: false, users: false, restaurants: false })
  const [busyId, setBusyId] = useState('')

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/', { replace: true })
  }

  const fetchStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    try {
      const { data } = await api.get('/api/admin/stats')
      setStats(data)
      const restaurantsRes = await api.get('/api/admin/restaurants', { params: { status: 'pending' } })
      setPendingRestaurantCount(restaurantsRes.data.length)
    } catch {
      toast.error('Failed to load admin stats')
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }, [])

  const fetchPending = useCallback(async () => {
    setLoading(prev => ({ ...prev, pending: true }))
    try {
      const { data } = await api.get('/api/admin/pending-users')
      setPending(data)
    } catch {
      toast.error('Failed to load pending approvals')
    } finally {
      setLoading(prev => ({ ...prev, pending: false }))
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(prev => ({ ...prev, users: true }))
    try {
      const params = roleFilter === 'all' ? {} : { role: roleFilter }
      const { data } = await api.get('/api/admin/all-users', { params })
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(prev => ({ ...prev, users: false }))
    }
  }, [roleFilter])

  const fetchRestaurants = useCallback(async () => {
    setLoading(prev => ({ ...prev, restaurants: true }))
    try {
      const params = restaurantFilter === 'pending' ? { status: 'pending' } : {}
      const { data } = await api.get('/api/admin/restaurants', { params })
      setRestaurants(data)
      if (restaurantFilter === 'pending') setPendingRestaurantCount(data.length)
    } catch {
      toast.error('Failed to load restaurants')
    } finally {
      setLoading(prev => ({ ...prev, restaurants: false }))
    }
  }, [restaurantFilter])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (active === 'Pending Approvals') fetchPending() }, [active, fetchPending])
  useEffect(() => { if (active === 'Restaurants') fetchRestaurants() }, [active, fetchRestaurants])
  useEffect(() => { if (active === 'All Users') fetchUsers() }, [active, fetchUsers])

  const approveUser = async (userId, approved) => {
    if (!approved && !window.confirm('Are you sure you want to reject this user?')) return
    setBusyId(`${userId}:${approved ? 'approve' : 'reject'}`)
    try {
      await api.patch(`/api/admin/approve-user/${userId}`, { approved })
      setPending(prev => prev.filter(user => user.id !== userId))
      toast[approved ? 'success' : 'error'](approved ? 'User approved successfully' : 'User rejected')
      fetchStats()
    } catch {
      toast.error(approved ? 'Failed to approve user' : 'Failed to reject user')
    } finally {
      setBusyId('')
    }
  }

  const suspendUser = async (userId) => {
    setBusyId(`${userId}:suspend`)
    try {
      await api.patch(`/api/admin/suspend-user/${userId}`)
      setUsers(prev => prev.map(user => user.id === userId ? { ...user, is_active: false } : user))
      toast.success('User suspended')
    } catch {
      toast.error('Failed to suspend user')
    } finally {
      setBusyId('')
    }
  }

  const updateRestaurantApproval = async (restaurantId, approved) => {
    if (!approved && !window.confirm('Reject this restaurant?')) return
    setBusyId(`${restaurantId}:${approved ? 'approve-restaurant' : 'reject-restaurant'}`)
    try {
      await api.patch(`/api/admin/restaurants/${restaurantId}/approve`, { approved })
      const nextStatus = approved ? 'approved' : 'rejected'
      setRestaurants(prev => prev.map(restaurant => (
        restaurant.id === restaurantId ? { ...restaurant, status: nextStatus } : restaurant
      )))
      if (approved) {
        toast.success('Restaurant approved. Donor can now list food.')
      } else {
        toast.error('Restaurant rejected')
      }
      fetchStats()
    } catch {
      toast.error(approved ? 'Failed to approve restaurant' : 'Failed to reject restaurant')
    } finally {
      setBusyId('')
    }
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(user =>
      user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)
    )
  }, [search, users])

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, color: '#2563eb' },
    { label: 'Pending Approvals', value: stats?.pending_approvals ?? 0, color: (stats?.pending_approvals ?? 0) > 0 ? '#f59e0b' : '#2563eb' },
    { label: 'Pending Restaurants', value: pendingRestaurantCount, color: pendingRestaurantCount > 0 ? '#f59e0b' : '#2563eb' },
    { label: 'Total Listings', value: stats?.total_listings ?? 0, color: '#16a34a' },
    { label: 'Total Deliveries', value: stats?.total_deliveries ?? 0, color: '#16a34a' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#1c1c1c', color: '#fff' }}>
      <style>{`
        @keyframes adminSpin { to { transform: rotate(360deg); } }
        .admin-table th, .admin-table td { padding: 14px 16px; border-bottom: 1px solid #303030; text-align: left; vertical-align: top; }
        .admin-table th { color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 0; }
        .admin-button { border: 0; border-radius: 8px; padding: 9px 13px; font-weight: 800; font-size: 13px; cursor: pointer; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      `}</style>

      <nav style={{
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid #303030',
        background: '#181818',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>FoodBridge Admin</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#d4d4d4', fontSize: 14 }}>{state.user?.name || 'Admin'}</span>
          <button className="admin-button" onClick={logout} style={{ background: '#2a2a2a', color: '#fff' }}>Logout</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', minHeight: 'calc(100vh - 68px)' }}>
        <aside style={{ borderRight: '1px solid #303030', background: '#181818', padding: 18 }}>
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => setActive(item)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 0,
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 8,
                cursor: 'pointer',
                background: active === item ? '#2563eb' : 'transparent',
                color: active === item ? '#fff' : '#d4d4d4',
                fontWeight: active === item ? 800 : 600,
              }}
            >
              {item}
            </button>
          ))}
        </aside>

        <main style={{ padding: 28, overflow: 'auto' }}>
          {active === 'Overview' && (
            <section>
              <h1 style={{ fontSize: 28, margin: '0 0 22px' }}>Overview</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 18, maxWidth: 760 }}>
                {statCards.map(card => (
                  <div key={card.label} style={{ borderRadius: 8, border: `1px solid ${card.color}`, background: '#242424', padding: 22 }}>
                    <div style={{ color: card.color, fontSize: 34, fontWeight: 900 }}>
                      {loading.stats ? <Spinner /> : card.value}
                    </div>
                    <div style={{ color: '#a3a3a3', fontSize: 13, marginTop: 8 }}>{card.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === 'Pending Approvals' && (
            <section>
              <h1 style={{ fontSize: 28, margin: '0 0 22px' }}>Pending Approvals</h1>
              {loading.pending ? (
                <div style={{ color: '#d4d4d4' }}>Loading pending approvals...</div>
              ) : pending.length === 0 ? (
                <div style={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#d4d4d4' }}>
                  <div>
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                      <circle cx="36" cy="36" r="31" stroke="#22c55e" strokeWidth="5" />
                      <path d="M22 37l9 9 20-22" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ marginTop: 14, fontSize: 18, fontWeight: 800 }}>No pending approvals</div>
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #303030', borderRadius: 8 }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#242424' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Registered On</th>
                        <th>Details</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map(user => (
                        <tr key={user.id}>
                          <td style={{ color: '#fff', fontWeight: 800 }}>{user.name}</td>
                          <td style={{ color: '#d4d4d4' }}>{user.email}</td>
                          <td><RoleBadge role={user.role} /></td>
                          <td style={{ color: '#d4d4d4' }}>{formatDate(user.created_at)}</td>
                          <td style={{ color: '#d4d4d4', maxWidth: 360 }}>{pendingDetails(user)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                className="admin-button"
                                onClick={() => approveUser(user.id, true)}
                                disabled={Boolean(busyId)}
                                style={{ background: '#16a34a', color: '#fff', minWidth: 92 }}
                              >
                                {busyId === `${user.id}:approve` ? <Spinner /> : 'Approve'}
                              </button>
                              <button
                                className="admin-button"
                                onClick={() => approveUser(user.id, false)}
                                disabled={Boolean(busyId)}
                                style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', minWidth: 84 }}
                              >
                                {busyId === `${user.id}:reject` ? <Spinner /> : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {active === 'Restaurants' && (
            <section>
              <h1 style={{ fontSize: 28, margin: '0 0 22px' }}>Restaurants</h1>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                  className="admin-button"
                  onClick={() => setRestaurantFilter('pending')}
                  style={{
                    background: restaurantFilter === 'pending' ? '#3a2808' : '#242424',
                    color: restaurantFilter === 'pending' ? '#fbbf24' : '#d4d4d4',
                    border: '1px solid #3a3a3a',
                  }}
                >
                  Pending Only
                </button>
                <button
                  className="admin-button"
                  onClick={() => setRestaurantFilter('all')}
                  style={{
                    background: restaurantFilter === 'all' ? '#2563eb' : '#242424',
                    color: restaurantFilter === 'all' ? '#fff' : '#d4d4d4',
                    border: '1px solid #3a3a3a',
                  }}
                >
                  All
                </button>
              </div>

              {loading.restaurants ? (
                <div style={{ color: '#d4d4d4' }}>Loading restaurants...</div>
              ) : restaurants.length === 0 && restaurantFilter === 'pending' ? (
                <div style={{ minHeight: 320, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#d4d4d4' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>No pending restaurant approvals</div>
                </div>
              ) : restaurants.length === 0 ? (
                <div style={{ minHeight: 320, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#d4d4d4' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>No restaurants found</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #303030', borderRadius: 8 }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#242424' }}>
                    <thead>
                      <tr>
                        <th>Restaurant Name</th>
                        <th>Owner Name</th>
                        <th>Owner Email</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.map(restaurant => (
                        <tr key={restaurant.id}>
                          <td>
                            <div style={{ color: '#fff', fontWeight: 800 }}>{restaurant.name}</div>
                            <div style={{ color: '#a3a3a3', fontSize: 12, marginTop: 4 }}>
                              {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
                            </div>
                          </td>
                          <td style={{ color: '#d4d4d4' }}>{restaurant.owner_name || restaurant.owner?.name || 'N/A'}</td>
                          <td style={{ color: '#d4d4d4' }}>{restaurant.owner_email || restaurant.owner?.email || 'N/A'}</td>
                          <td><RestaurantStatusBadge status={restaurant.status} /></td>
                          <td>
                            {restaurant.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                  className="admin-button"
                                  onClick={() => updateRestaurantApproval(restaurant.id, true)}
                                  disabled={Boolean(busyId)}
                                  style={{ background: '#16a34a', color: '#fff', minWidth: 154 }}
                                >
                                  {busyId === `${restaurant.id}:approve-restaurant` ? <Spinner /> : 'Approve Restaurant'}
                                </button>
                                <button
                                  className="admin-button"
                                  onClick={() => updateRestaurantApproval(restaurant.id, false)}
                                  disabled={Boolean(busyId)}
                                  style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', minWidth: 84 }}
                                >
                                  {busyId === `${restaurant.id}:reject-restaurant` ? <Spinner /> : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#737373', fontSize: 13 }}>No action</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {active === 'All Users' && (
            <section>
              <h1 style={{ fontSize: 28, margin: '0 0 22px' }}>All Users</h1>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  style={{ minWidth: 260, flex: '1 1 260px', borderRadius: 8, border: '1px solid #3a3a3a', background: '#242424', color: '#fff', padding: '11px 12px' }}
                />
                <select
                  value={roleFilter}
                  onChange={event => setRoleFilter(event.target.value)}
                  style={{ borderRadius: 8, border: '1px solid #3a3a3a', background: '#242424', color: '#fff', padding: '11px 12px' }}
                >
                  <option value="all">All</option>
                  <option value="donor">Donor</option>
                  <option value="shelter">Shelter</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #303030', borderRadius: 8 }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#242424' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.users ? (
                      <tr><td colSpan="6" style={{ color: '#d4d4d4' }}>Loading users...</td></tr>
                    ) : filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td style={{ color: '#fff', fontWeight: 800 }}>{user.name}</td>
                        <td style={{ color: '#d4d4d4' }}>{user.email}</td>
                        <td><RoleBadge role={user.role} /></td>
                        <td><StatusBadge user={user} /></td>
                        <td style={{ color: '#d4d4d4' }}>{formatDate(user.created_at)}</td>
                        <td>
                          {user.is_active && (
                            <button
                              className="admin-button"
                              onClick={() => suspendUser(user.id)}
                              disabled={Boolean(busyId)}
                              style={{ background: '#3a1414', color: '#f87171', minWidth: 92 }}
                            >
                              {busyId === `${user.id}:suspend` ? <Spinner /> : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(active === 'Food Listings' || active === 'Deliveries') && (
            <section>
              <h1 style={{ fontSize: 28, margin: '0 0 10px' }}>{active}</h1>
              <p style={{ color: '#a3a3a3', margin: 0 }}>
                Use Overview for current totals. Detailed management for this section can be added on top of the admin API when needed.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

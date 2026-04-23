import api from './client'

export const createClaim = (data) => api.post('/api/claims', data)
export const getAvailableClaims = () => api.get('/api/claims/available')
export const getMyClaims = () => api.get('/api/claims/mine')
export const cancelClaim = (id) => api.patch(`/api/claims/${id}/cancel`)

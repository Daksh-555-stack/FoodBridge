import api from './client'

export const registerDriver = (data) => api.post('/api/drivers/register', data)
export const getMyDriverProfile = () => api.get('/api/drivers/me')
export const updateDriverAvailability = (data) => api.patch('/api/drivers/availability', data)

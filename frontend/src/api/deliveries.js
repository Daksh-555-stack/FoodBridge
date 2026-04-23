import api from './client'

export const acceptDelivery = (data) => api.post('/api/deliveries', data)
export const getMyDeliveries = () => api.get('/api/deliveries/mine')
export const markPickedUp = (id) => api.patch(`/api/deliveries/${id}/pickup`)
export const markDelivered = (id) => api.patch(`/api/deliveries/${id}/deliver`)
export const updateDriverLocation = (data) => api.patch('/api/deliveries/drivers/location', data)

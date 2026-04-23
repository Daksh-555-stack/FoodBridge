import api from './client'

export const getOverview = () => api.get('/api/admin/overview')
export const getUsers = (params) => api.get('/api/admin/users', { params })
export const approveUser = (id) => api.patch(`/api/admin/users/${id}/approve`)
export const getAllRestaurants = (params) => api.get('/api/admin/restaurants', { params })
export const approveRestaurant = (id, approved = true) => api.patch(`/api/admin/restaurants/${id}/approve`, { approved })
export const approveShelter = (id) => api.patch(`/api/admin/shelters/${id}/approve`)
export const getAllListings = () => api.get('/api/admin/listings')
export const getActiveDeliveries = () => api.get('/api/admin/deliveries')

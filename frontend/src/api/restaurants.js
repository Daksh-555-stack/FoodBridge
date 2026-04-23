import api from './client'

export const createRestaurant = (data) => api.post('/api/restaurants', data)
export const getMyRestaurants = () => api.get('/api/restaurants/mine')
export const getRestaurants = () => api.get('/api/restaurants')
export const updateRestaurant = (id, data) => api.patch(`/api/restaurants/${id}`, data)

import api from './client'

export const getListings = (params) => api.get('/api/listings', { params })
export const getListing = (id) => api.get(`/api/listings/${id}`)
export const getMyListings = () => api.get('/api/listings/mine')
export const createListing = (data) => api.post('/api/listings', data)
export const deleteListing = (id) => api.delete(`/api/listings/${id}`)

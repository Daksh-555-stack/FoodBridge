import api from './client'

export const registerShelter = (data) => api.post('/api/shelters/register', data)
export const getMyShelter = () => api.get('/api/shelters/mine')
export const updateShelter = (id, data) => api.patch(`/api/shelters/${id}`, data)

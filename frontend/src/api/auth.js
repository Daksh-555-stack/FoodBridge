import api from './client'

export const login = (data) => api.post('/api/auth/login', data)
export const register = (data) => api.post('/api/auth/register', data)
export const getMe = () => api.get('/api/auth/me')
export const updateMe = (data) => api.patch('/api/auth/me', data)
export const refreshToken = (data) => api.post('/api/auth/refresh', data)
export const googleLogin = () => api.get('/api/auth/google/login')
export const googleCallback = (code) => api.get(`/api/auth/google/callback?code=${code}`)

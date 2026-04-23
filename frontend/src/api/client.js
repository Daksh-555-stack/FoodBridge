import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fb_access_token') || localStorage.getItem('foodbridge_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const baseURL = config.baseURL || window.location.origin
  console.log('API Request:', config.method?.toUpperCase(), baseURL + config.url)
  return config
})

// Handle 401 globally with token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('NETWORK ERROR: Cannot reach backend through Vite proxy at', error.config?.baseURL || window.location.origin)
      console.error('Make sure backend is running on port 8000')
    }
    console.error('API Error:', error.response?.status, error.response?.data)

    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('fb_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken,
          })
          localStorage.setItem('fb_access_token', data.access_token)
          localStorage.setItem('fb_refresh_token', data.refresh_token)
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('fb_access_token')
          localStorage.removeItem('fb_refresh_token')
          localStorage.removeItem('fb_user')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('fb_access_token')
        localStorage.removeItem('fb_refresh_token')
        localStorage.removeItem('fb_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

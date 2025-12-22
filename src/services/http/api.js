import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://yellowgreen-falcon-528249.hostingersite.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

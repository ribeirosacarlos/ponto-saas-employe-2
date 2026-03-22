import axios from 'axios'
import { attachForbiddenInterceptor } from '../../lib/http/attachForbiddenInterceptor'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://api.jornafy.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const requestUrl = String(config.url || '')
  const isAuthRequest = ['/v1/auth/login', '/v1/auth/logout'].some((endpoint) => requestUrl.includes(endpoint))
  if (isAuthRequest) {
    delete config.headers.Authorization
    return config
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

attachForbiddenInterceptor(api)

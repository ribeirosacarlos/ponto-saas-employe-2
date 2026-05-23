import axios from 'axios'
import { attachForbiddenInterceptor } from '../../lib/http/attachForbiddenInterceptor'
import { readStoredToken } from '../../lib/authStorage'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://api.jornafy.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  if (config.skipAuth === true) {
    delete config.headers.Authorization
    return config
  }

  const token = readStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (!config.method || config.method.toLowerCase() === 'get') {
    config.headers['Cache-Control'] = 'no-cache'
    config.headers['Pragma'] = 'no-cache'
  }

  return config
})

attachForbiddenInterceptor(api)

import axios from 'axios'
import { attachForbiddenInterceptor } from '../../lib/http/attachForbiddenInterceptor'
import { readStoredToken } from '../../lib/authStorage'
import { emitAuthFailure } from '../../lib/authEvents'
import { normalizeApiError } from '../../lib/security/httpErrors'
import { securityLogger } from '../../lib/security/logger'

const DEFAULT_API_BASE_URL = 'https://api.jornafy.com/api'

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL

  try {
    const parsed = new URL(configuredUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol')
    }
    return parsed.toString().replace(/\/$/, '')
  } catch (error) {
    securityLogger.warn('[api] Invalid VITE_API_URL, falling back to default origin', { configuredUrl })
    return DEFAULT_API_BASE_URL
  }
}

const API_BASE_URL = resolveApiBaseUrl()

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  config.headers = config.headers || {}

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error)
    error.normalized = normalized
    error.userFriendlyMessage = error.userFriendlyMessage || normalized.message

    if (normalized.shouldClearSession && error?.config?.skipAuth !== true) {
      emitAuthFailure({
        reason: normalized.code,
        message: normalized.message,
        status: normalized.status,
      })
    }

    return Promise.reject(error)
  },
)

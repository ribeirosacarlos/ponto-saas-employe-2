import { api } from './http/api'
import { DEFAULT_TIMEZONE } from '../lib/datetime'
import { securityLogger } from '../lib/security/logger'

let cachedUserData = null
let lastFetchTime = 0
let inflightPromise = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

const normalizeCurrentUserPayload = (payload = {}) => {
  const nested = payload?.data && typeof payload.data === 'object' ? payload.data : null

  if (!nested) {
    return payload || {}
  }

  return {
    ...nested,
    timezone: payload.timezone ?? payload.timeZone ?? nested.timezone ?? nested.timeZone ?? null,
    timeZone: payload.timeZone ?? payload.timezone ?? nested.timeZone ?? nested.timezone ?? null,
  }
}

const shouldUseCache = (now, forceRefresh) =>
  !forceRefresh && cachedUserData && now - lastFetchTime < CACHE_DURATION

export async function getCurrentUser(forceRefresh = false) {
  const now = Date.now()

  if (shouldUseCache(now, forceRefresh)) {
    return cachedUserData
  }

  if (!forceRefresh && inflightPromise) {
    return inflightPromise
  }

  if (forceRefresh) {
    cachedUserData = null
    lastFetchTime = 0
  }

  inflightPromise = (async () => {
    try {
      const { data } = await api.get('/v1/auth/me')
      const userData = normalizeCurrentUserPayload(data || {})
      cachedUserData = userData
      lastFetchTime = Date.now()
      return userData
    } catch (error) {
      throw error
    } finally {
      inflightPromise = null
    }
  })()

  return inflightPromise
}

export function clearAuthCache() {
  cachedUserData = null
  lastFetchTime = 0
  inflightPromise = null
}

export async function getEffectiveTimezone() {
  try {
    const userData = await getCurrentUser()
    const timezone = extractTimezoneFromUser(userData)
    if (timezone) return timezone
  } catch (error) {
    securityLogger.warn('[authService] Failed to get timezone from user data', error)
  }

  // Fallback logic here (similar to existing timezone service)
  return DEFAULT_TIMEZONE
}

function extractTimezoneFromUser(payload = {}) {
  if (!payload) return null
  return (
    payload.timezone ||
    payload.timeZone ||
    payload.company?.timezone ||
    payload.company?.timeZone ||
    payload.user?.timezone ||
    payload.user?.company?.timezone ||
    null
  )
}

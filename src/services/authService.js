import { api } from './http/api'
import { DEFAULT_TIMEZONE } from '../lib/datetime'

let cachedUserData = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

export async function getCurrentUser(forceRefresh = false) {
  const now = Date.now()
  
  // Return cached data if still valid and not forced refresh
  if (!forceRefresh && cachedUserData && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedUserData
  }

  try {
    const { data } = await api.get('/v1/auth/me')
    const userData = data?.data || data || {}
    
    // Cache the result
    cachedUserData = userData
    lastFetchTime = now
    
    return userData
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    throw error
  }
}

export function clearAuthCache() {
  console.log('[AuthService] Clearing cached user data')
  cachedUserData = null
  lastFetchTime = 0
}

export async function getEffectiveTimezone() {
  try {
    const userData = await getCurrentUser()
    const timezone = extractTimezoneFromUser(userData)
    if (timezone) return timezone
  } catch (error) {
    console.warn('Failed to get timezone from user data:', error)
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
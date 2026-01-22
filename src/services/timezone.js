import { api } from './http/api'
import { fetchCompanyTimezone } from './companyTimezoneService'
import { getSettingsOverview } from './settings/getSettingsOverview'
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../lib/datetime'

const TZ_STORAGE_KEY = 'company_timezone'

const readStoredTimezone = () => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(TZ_STORAGE_KEY)
  return stored || null
}

export const persistTimezone = (value) => {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(TZ_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(TZ_STORAGE_KEY, value)
}

export const getStoredTimezone = () => {
  const stored = readStoredTimezone()
  if (!stored) return null
  return isValidTimeZone(stored) ? stored : null
}

const logDev = (...args) => {
  if (import.meta?.env?.DEV) {
    console.warn('[timezone] ', ...args)
  }
}

const extractTimezoneFromMe = (payload = {}) => {
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

export async function fetchEffectiveTimezone() {
  try {
    const { data } = await api.get('/v1/auth/me')
    const payload = data?.data ?? data ?? {}
    const fromMe = extractTimezoneFromMe(payload)
    if (fromMe) return fromMe
  } catch (error) {
    logDev('Failed to fetch /v1/auth/me for timezone', error)
  }

  try {
    const response = await fetchCompanyTimezone()
    if (response?.timezone) return response.timezone
  } catch (error) {
    logDev('Failed to fetch company timezone endpoint', error)
  }

  try {
    const overview = await getSettingsOverview()
    const candidate = overview?.company?.timezone
    if (candidate) return candidate
  } catch (error) {
    logDev('Failed to fetch settings overview for timezone', error)
  }

  return DEFAULT_TIMEZONE
}

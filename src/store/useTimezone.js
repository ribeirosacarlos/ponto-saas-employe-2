import { create } from 'zustand'
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../lib/datetime'
import { fetchEffectiveTimezone, getStoredTimezone, persistTimezone } from '../services/timezone'

const initialTimezone = getStoredTimezone() || DEFAULT_TIMEZONE

export const useTimezoneStore = create((set, get) => ({
  timezone: initialTimezone,
  isTimezoneReady: Boolean(getStoredTimezone()),
  loading: false,
  setTimezone: (value) => {
    const nextTz = isValidTimeZone(value) ? value : DEFAULT_TIMEZONE
    persistTimezone(nextTz)
    set({ timezone: nextTz })
  },
  resetTimezone: () => {
    persistTimezone(DEFAULT_TIMEZONE)
    set({ timezone: DEFAULT_TIMEZONE, isTimezoneReady: false })
  },
  loadTimezone: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const candidate = await fetchEffectiveTimezone()
      const nextTz = isValidTimeZone(candidate) ? candidate : DEFAULT_TIMEZONE
      persistTimezone(nextTz)
      set({ timezone: nextTz, isTimezoneReady: true })
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.warn('[useTimezone] failed to load timezone', error)
      }
      set({ timezone: DEFAULT_TIMEZONE, isTimezoneReady: true })
    } finally {
      set({ loading: false })
    }
  },
}))

export const DEFAULT_TIMEZONE = 'Europe/Madrid'
const PLACEHOLDER = '-'

const safeSupportedTimeZones =
  typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : null

export const isValidTimeZone = (value) => {
  if (!value || typeof value !== 'string') return false
  try {
    if (safeSupportedTimeZones) {
      return safeSupportedTimeZones.includes(value)
    }
    // Fallback validation for environments without supportedValuesOf
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return true
  } catch (error) {
    return false
  }
}

const normalizeInput = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    // If the string is an ISO-like datetime without timezone, assume it is UTC to avoid local skew.
    const maybeUtc =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) ? `${value}Z` : value
    const date = new Date(maybeUtc)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const formatWithIntl = (value, { locale, timeZone, ...options }) => {
  const date = normalizeInput(value)
  if (!date) return PLACEHOLDER

  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE
  const resolvedLocale = locale || 'pt-BR'

  try {
    return new Intl.DateTimeFormat(resolvedLocale, { timeZone: tz, ...options }).format(date)
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.warn('[datetime] Failed to format date', { value, options, error })
    }
    return PLACEHOLDER
  }
}

export const formatDate = (value, { locale, timeZone, ...options } = {}) =>
  formatWithIntl(value, {
    locale,
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })

export const formatDateTime = (value, { locale, timeZone, ...options } = {}) =>
  formatWithIntl(value, {
    locale,
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  })

export const formatTime = (value, { locale, timeZone, ...options } = {}) =>
  formatWithIntl(value, {
    locale,
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  })

export const toZonedParts = (value, { locale, timeZone } = {}) => {
  const date = normalizeInput(value)
  if (!date) return null

  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE
  const resolvedLocale = locale || 'en-US'

  try {
    const formatter = new Intl.DateTimeFormat(resolvedLocale, {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type)?.value

    const year = Number(get('year'))
    const month = Number(get('month'))
    const day = Number(get('day'))
    const hour = Number(get('hour'))
    const minute = Number(get('minute'))
    const second = Number(get('second'))

    if ([year, month, day].some((part) => Number.isNaN(part))) return null

    return { year, month, day, hour, minute, second, parts }
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.warn('[datetime] Failed to extract zoned parts', { value, timeZone, error })
    }
    return null
  }
}

export const formatDateISO = (value, { timeZone, locale } = {}) => {
  const zoned = toZonedParts(value, { timeZone, locale })
  if (!zoned) return null
  const { year, month, day } = zoned
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export const isSameDayInZone = (left, right, { timeZone, locale } = {}) => {
  const leftKey = formatDateISO(left, { timeZone, locale })
  const rightKey = formatDateISO(right, { timeZone, locale })
  return Boolean(leftKey && rightKey && leftKey === rightKey)
}

export const toCompanyDate = (value, timeZone) => formatDateISO(value, { timeZone })

export const isSameCompanyDay = (value, timeZone, targetDateStr) => {
  if (!value || !targetDateStr) return false
  const entryDate = toCompanyDate(value, timeZone)
  return entryDate === targetDateStr
}

export const getCompanyTimezone = (maybeTz) =>
  isValidTimeZone(maybeTz) ? maybeTz : DEFAULT_TIMEZONE

export const formatRelative = (value, reference = new Date(), { locale, timeZone } = {}) => {
  const date = normalizeInput(value)
  const ref = normalizeInput(reference)
  if (!date || !ref) return PLACEHOLDER

  const diffMs = date.getTime() - ref.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffSeconds / 60)
  const diffHours = Math.round(diffMinutes / 60)
  const diffDays = Math.round(diffHours / 24)

  const rtfLocale = locale || 'en'
  const formatter = new Intl.RelativeTimeFormat(rtfLocale, { numeric: 'auto' })

  if (Math.abs(diffSeconds) < 60) return formatter.format(diffSeconds, 'second')
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute')
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')
  return formatter.format(diffDays, 'day')
}

export const coerceDatePlaceholder = (value) => (value === null || value === undefined ? PLACEHOLDER : value)

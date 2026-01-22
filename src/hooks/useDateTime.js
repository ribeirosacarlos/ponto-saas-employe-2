import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_TIMEZONE,
  coerceDatePlaceholder,
  formatDate,
  formatDateISO,
  formatDateTime,
  formatRelative,
  formatTime,
  isSameDayInZone,
  toZonedParts,
} from '../lib/datetime'
import { useTimezoneStore } from '../store/useTimezone'

export function useDateTime() {
  const { i18n } = useTranslation()
  const timezone = useTimezoneStore((state) => state.timezone)
  const isTimezoneReady = useTimezoneStore((state) => state.isTimezoneReady)

  const locale = i18n.language || 'pt-BR'
  const tz = timezone || DEFAULT_TIMEZONE

  const helpers = useMemo(
    () => ({
      tz,
      locale,
      isTimezoneReady,
      formatDate: (value, options = {}) => formatDate(value, { locale, timeZone: tz, ...options }),
      formatDateTime: (value, options = {}) =>
        formatDateTime(value, { locale, timeZone: tz, ...options }),
      formatTime: (value, options = {}) => formatTime(value, { locale, timeZone: tz, ...options }),
      formatRelative: (value, reference, options = {}) =>
        formatRelative(value, reference, { locale, timeZone: tz, ...options }),
      formatDateForApi: (value) => formatDateISO(value, { timeZone: tz, locale }),
      toCompanyZonedParts: (value) => toZonedParts(value, { locale, timeZone: tz }),
      isSameDay: (left, right) => isSameDayInZone(left, right, { locale, timeZone: tz }),
      placeholder: coerceDatePlaceholder,
    }),
    [tz, locale, isTimezoneReady],
  )

  return helpers
}

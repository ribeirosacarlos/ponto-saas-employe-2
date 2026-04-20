/**
 * @typedef {Object} PlatformCompanySettingsCompanySummary
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 */

/**
 * @typedef {Object} PlatformCompanySettings
 * @property {PlatformCompanySettingsCompanySummary|null} company
 * @property {string} timezone
 * @property {boolean} audit_logs_enabled
 * @property {string[]} available_timezones
 */

/**
 * @typedef {Object} PlatformCompanySettingsUpdatePayload
 * @property {string=} timezone
 * @property {boolean=} audit_logs_enabled
 */

const normalizeCompanySummary = (payload = {}) => ({
  id: payload?.id ?? '',
  name: payload?.name ?? '',
  slug: payload?.slug ?? '',
})

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  return fallback
}

/**
 * @param {unknown} payload
 * @returns {PlatformCompanySettings}
 */
export function normalizePlatformCompanySettings(payload = {}) {
  const source = payload?.data ?? payload ?? {}

  return {
    company: source?.company ? normalizeCompanySummary(source.company) : null,
    timezone: source?.timezone ?? '',
    audit_logs_enabled: toBoolean(source?.audit_logs_enabled, false),
    available_timezones: Array.isArray(source?.available_timezones) ? source.available_timezones : [],
  }
}

/**
 * @param {{ timezone: string, audit_logs_enabled: boolean }} values
 * @param {{ timezone: string, audit_logs_enabled: boolean } | null} initialValues
 * @returns {PlatformCompanySettingsUpdatePayload}
 */
export function serializePlatformCompanySettingsPayload(values, initialValues) {
  const payload = {}

  if (values?.timezone && values.timezone !== initialValues?.timezone) {
    payload.timezone = values.timezone
  }

  if (values?.audit_logs_enabled !== initialValues?.audit_logs_enabled) {
    payload.audit_logs_enabled = values.audit_logs_enabled === true
  }

  return payload
}

/**
 * @typedef {Object} AdminLocationSettings
 * @property {number|null} company_latitude
 * @property {number|null} company_longitude
 * @property {number} allowed_radius_meters
 * @property {boolean} location_validation_enabled
 * @property {boolean} is_configured
 */

/**
 * @typedef {Object} AdminLocationSettingsPayload
 * @property {number} company_latitude
 * @property {number} company_longitude
 * @property {number} allowed_radius_meters
 * @property {boolean} location_validation_enabled
 */

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  return fallback
}

/**
 * @param {unknown} payload
 * @returns {AdminLocationSettings}
 */
export function normalizeAdminLocationSettings(payload = {}) {
  const source = payload?.data ?? payload ?? {}

  return {
    company_latitude: toNullableNumber(source.company_latitude),
    company_longitude: toNullableNumber(source.company_longitude),
    allowed_radius_meters: Number.isInteger(source.allowed_radius_meters)
      ? source.allowed_radius_meters
      : Number.isFinite(Number(source.allowed_radius_meters))
        ? Math.trunc(Number(source.allowed_radius_meters))
        : 100,
    location_validation_enabled: toBoolean(source.location_validation_enabled, false),
    is_configured: toBoolean(source.is_configured, false),
  }
}

/**
 * @param {AdminLocationSettings} settings
 */
export function createAdminLocationSettingsFormValues(settings) {
  return {
    company_latitude:
      settings?.company_latitude === null || settings?.company_latitude === undefined
        ? ''
        : String(settings.company_latitude),
    company_longitude:
      settings?.company_longitude === null || settings?.company_longitude === undefined
        ? ''
        : String(settings.company_longitude),
    allowed_radius_meters:
      settings?.allowed_radius_meters === null || settings?.allowed_radius_meters === undefined
        ? ''
        : String(settings.allowed_radius_meters),
    location_validation_enabled: settings?.location_validation_enabled === true,
  }
}

/**
 * @param {{ company_latitude: string, company_longitude: string, allowed_radius_meters: string, location_validation_enabled: boolean }} values
 * @returns {AdminLocationSettingsPayload}
 */
export function serializeAdminLocationSettingsPayload(values) {
  return {
    company_latitude: Number(values.company_latitude),
    company_longitude: Number(values.company_longitude),
    allowed_radius_meters: Math.trunc(Number(values.allowed_radius_meters)),
    location_validation_enabled: Boolean(values.location_validation_enabled),
  }
}

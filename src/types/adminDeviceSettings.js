/**
 * @typedef {Object} AdminDeviceSettings
 * @property {boolean} allow_mobile_clock
 * @property {boolean} allow_desktop_clock
 */

const toBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value
  return fallback
}

/**
 * @param {unknown} payload
 * @returns {AdminDeviceSettings}
 */
export function normalizeAdminDeviceSettings(payload = {}) {
  const source = payload?.data ?? payload ?? {}

  return {
    allow_mobile_clock: toBoolean(source.allow_mobile_clock, true),
    allow_desktop_clock: toBoolean(source.allow_desktop_clock, true),
  }
}

/**
 * @param {{ mobile: boolean, desktop: boolean }} values
 * @returns {AdminDeviceSettings}
 */
export function serializeAdminDeviceSettingsPayload(values) {
  return {
    allow_mobile_clock: values?.mobile === true,
    allow_desktop_clock: values?.desktop === true,
  }
}


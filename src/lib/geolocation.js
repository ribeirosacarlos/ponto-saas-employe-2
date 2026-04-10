const GEOLOCATION_TIMEOUT_MS = 10000

const GEOLOCATION_ERROR_CODES = {
  PERMISSION_DENIED: 'permission_denied',
  PERMISSION_BLOCKED: 'permission_blocked',
  POSITION_UNAVAILABLE: 'position_unavailable',
  TIMEOUT: 'timeout',
  UNSUPPORTED: 'unsupported',
}

const normalizeCoordinates = (position) => {
  const latitude = Number(position?.coords?.latitude)
  const longitude = Number(position?.coords?.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return { latitude, longitude }
}

const createGeolocationError = (code, originalError = null) => {
  const error = new Error(code)
  error.code = code
  error.originalError = originalError
  return error
}

async function getPermissionState() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return null
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result?.state ?? null
  } catch {
    return null
  }
}

function getCurrentPosition({ timeout = GEOLOCATION_TIMEOUT_MS, enableHighAccuracy = false } = {}) {
  if (
    typeof navigator === 'undefined' ||
    !navigator.geolocation ||
    typeof navigator.geolocation.getCurrentPosition !== 'function'
  ) {
    throw createGeolocationError(GEOLOCATION_ERROR_CODES.UNSUPPORTED)
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error?.code) {
          case error?.PERMISSION_DENIED:
          case 1:
            reject(createGeolocationError(GEOLOCATION_ERROR_CODES.PERMISSION_DENIED, error))
            return
          case error?.TIMEOUT:
          case 3:
            reject(createGeolocationError(GEOLOCATION_ERROR_CODES.TIMEOUT, error))
            return
          case error?.POSITION_UNAVAILABLE:
          case 2:
          default:
            reject(createGeolocationError(GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE, error))
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge: 0,
      },
    )
  })
}

export async function getClockCoordinates({
  required = false,
  timeout = GEOLOCATION_TIMEOUT_MS,
  enableHighAccuracy = false,
} = {}) {
  const permissionState = await getPermissionState()

  if (required && permissionState === 'denied') {
    throw createGeolocationError(GEOLOCATION_ERROR_CODES.PERMISSION_BLOCKED)
  }

  if (!required && permissionState !== 'granted') {
    return null
  }

  const position = await getCurrentPosition({ timeout, enableHighAccuracy })
  const coordinates = normalizeCoordinates(position)

  if (!coordinates) {
    throw createGeolocationError(GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE)
  }

  return coordinates
}

export function getGeolocationErrorCode(error) {
  return error?.code || GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE
}

export function getClockSource() {
  return 'web'
}

export { GEOLOCATION_ERROR_CODES, GEOLOCATION_TIMEOUT_MS }

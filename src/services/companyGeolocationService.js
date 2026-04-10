import { api } from './http/api'

const BASE_PATH = '/v1/admin/company/geolocation'

const readBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  return fallback
}

const normalizeResponse = (payload = {}) => {
  const source = payload?.data ?? payload ?? {}

  return {
    feature_available: readBoolean(source.feature_available ?? source.featureAvailable, false),
    required_on_clock: readBoolean(source.required_on_clock ?? source.requiredOnClock, false),
  }
}

export async function fetchCompanyGeolocation() {
  const { data } = await api.get(BASE_PATH)
  return normalizeResponse(data)
}

export async function updateCompanyGeolocation(requiredOnClock) {
  const { data } = await api.put(BASE_PATH, {
    required_on_clock: Boolean(requiredOnClock),
  })

  return normalizeResponse(data)
}

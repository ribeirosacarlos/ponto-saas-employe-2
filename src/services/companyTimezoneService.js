import { api } from './http/api'

const BASE_PATH = '/v1/admin/company/timezone'

const normalizeResponse = (payload = {}) => ({
  timezone: payload.timezone ?? payload?.data?.timezone ?? null,
  available_timezones:
    payload.available_timezones ??
    payload.availableTimezones ??
    payload?.data?.available_timezones ??
    payload?.data?.availableTimezones ??
    [],
})

export async function fetchCompanyTimezone() {
  const { data } = await api.get(BASE_PATH)
  return normalizeResponse(data)
}

export async function updateCompanyTimezone(timezone) {
  const { data } = await api.put(BASE_PATH, { timezone })
  return normalizeResponse(data)
}

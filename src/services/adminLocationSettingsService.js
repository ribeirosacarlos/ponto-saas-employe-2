import { api } from './http/api'
import { normalizeAdminLocationSettings } from '../types/adminLocationSettings'

const BASE_PATH = '/v1/admin/settings/location'

export async function fetchAdminLocationSettings() {
  const { data } = await api.get(BASE_PATH)
  return normalizeAdminLocationSettings(data)
}

export async function updateAdminLocationSettings(payload) {
  const { data } = await api.put(BASE_PATH, payload)
  return normalizeAdminLocationSettings(data)
}

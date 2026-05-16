import { api } from './http/api'
import { normalizeAdminDeviceSettings } from '../types/adminDeviceSettings'

const BASE_PATH = '/v1/admin/company/device-settings'

export async function fetchAdminDeviceSettings() {
  const { data } = await api.get(BASE_PATH, { skipAccessDeniedHandling: true })
  return normalizeAdminDeviceSettings(data)
}

export async function updateAdminDeviceSettings(payload) {
  const { data } = await api.put(BASE_PATH, payload)
  return normalizeAdminDeviceSettings(data)
}


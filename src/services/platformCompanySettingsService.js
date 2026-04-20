import { api } from './http/api'
import { normalizePlatformCompanySettings } from '../types/platformCompanySettings'

const buildPath = (companyId) => `/v1/platform/companies/${companyId}/settings`

export async function fetchPlatformCompanySettings(companyId) {
  const { data } = await api.get(buildPath(companyId))
  return normalizePlatformCompanySettings(data)
}

export async function updatePlatformCompanySettings(companyId, payload) {
  const { data } = await api.patch(buildPath(companyId), payload)
  return normalizePlatformCompanySettings(data)
}

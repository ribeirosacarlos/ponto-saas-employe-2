import { api } from './http/api'

const BASE_PATH = '/v1/admin/company/info'

export async function fetchCompanyInfo() {
  const { data } = await api.get(BASE_PATH, { skipAccessDeniedHandling: true })
  return data
}

export async function updateCompanyInfo(payload) {
  const { data } = await api.patch(BASE_PATH, payload)
  return data
}

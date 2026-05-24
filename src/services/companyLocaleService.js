import { api } from './http/api'

const BASE_PATH = '/v1/admin/company/locale'

export async function fetchCompanyLocale() {
  const { data } = await api.get(BASE_PATH, { skipAccessDeniedHandling: true })
  return data
}

export async function updateCompanyLocale(payload) {
  const { data } = await api.put(BASE_PATH, payload)
  return data
}

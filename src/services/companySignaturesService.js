import { api } from './http/api'

const BASE_PATH = '/v1/admin/company/signatures'

export async function fetchCompanySignatures() {
  const { data } = await api.get(BASE_PATH, { skipAccessDeniedHandling: true })
  return data
}

export async function updateCompanySignatures(payload) {
  const { data } = await api.put(BASE_PATH, payload)
  return data
}

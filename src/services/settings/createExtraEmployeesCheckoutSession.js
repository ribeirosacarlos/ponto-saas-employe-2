import { api } from '../http/api'

export async function createExtraEmployeesCheckoutSession() {
  const { data } = await api.post('/v1/admin/billing/extra-employees/checkout-session')
  const payload = data?.data ?? data ?? {}

  return {
    url: payload.url ?? null,
  }
}

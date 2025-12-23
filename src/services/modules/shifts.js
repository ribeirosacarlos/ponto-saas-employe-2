import { api } from '../http/api'

export async function listShifts() {
  const { data } = await api.get('/v1/admin/shifts')
  const shifts = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return shifts
}

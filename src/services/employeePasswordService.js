import { api } from './http/api'

export async function updateEmployeePassword(payload) {
  const { data } = await api.put('/v1/employee/password', payload)
  return data
}

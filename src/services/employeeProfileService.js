import { api } from './http/api'

export async function updateEmployeeProfile(payload) {
  const { data } = await api.patch('/v1/employee/profile', payload)
  return data?.user ?? data
}

import { api } from '../http/api'

export async function listEmployees(page = 1, filters = {}) {
  const params = { page }
  if (filters.search) params.search = filters.search
  if (filters.role && filters.role !== 'all') params.role = filters.role

  const { data } = await api.get('/v1/admin/employees', { params })

  const employees = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.employees)
      ? data.employees
      : Array.isArray(data)
        ? data
        : []

  const metaSource = data?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? page,
    perPage: metaSource.per_page ?? metaSource.perPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { data: employees, meta }
}

export async function createEmployee(payload) {
  const { data } = await api.post('/v1/admin/employees', payload)
  return data?.data || data
}

export async function getEmployee(id) {
  const { data } = await api.get(`/v1/admin/employees/${id}`)
  return data?.data || data
}

export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/v1/admin/employees/${id}`, payload)
  return data?.data || data
}

export async function deleteEmployee(id) {
  const { data } = await api.delete(`/v1/admin/employees/${id}`)
  return data?.data || data
}

export async function assignEmployeeShift(id, payload) {
  const { data } = await api.post(`/v1/admin/employees/${id}/shift`, payload)
  return data?.data || data
}

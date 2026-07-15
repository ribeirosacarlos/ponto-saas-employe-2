import { api } from '../http/api'
import { normalizeOvertimePayload } from '../../lib/timesheet'

export async function listEmployees(page = 1, filters = {}) {
  const params = {}
  if (page) params.page = page
  if (filters.perPage) params.per_page = filters.perPage
  if (filters.per_page) params.per_page = filters.per_page
  if (filters.status) params.status = filters.status

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

export async function listAllEmployees(filters = {}) {
  const perPage =
    filters.perPage ??
    filters.per_page ??
    100

  const collected = []
  let page = 1
  let lastPage = 1

  do {
    const response = await listEmployees(page, { ...filters, perPage })
    collected.push(...(Array.isArray(response?.data) ? response.data : []))

    const nextLastPage = Number(response?.meta?.lastPage ?? response?.meta?.last_page ?? 0)
    if (Number.isFinite(nextLastPage) && nextLastPage > 0) {
      lastPage = nextLastPage
    } else if (!response?.data?.length || response.data.length < perPage) {
      lastPage = page
    } else {
      lastPage = page + 1
    }

    page += 1
  } while (page <= lastPage && page <= 50)

  return collected
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

export async function resendEmployeeInvite(id) {
  const { data } = await api.post(`/v1/admin/employees/${id}/resend-invite`)
  return data?.data || data
}

export async function restoreEmployee(id) {
  const { data } = await api.post(`/v1/admin/employees/${id}/restore`)
  return data?.data || data
}

export async function getEmployeeOvertimeBalance(employeeId, { from, to, includeDays } = {}) {
  if (!employeeId) {
    throw new Error('employeeId is required to fetch overtime balance')
  }

  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (includeDays !== undefined) params.include_days = includeDays ? 1 : 0

  const { data } = await api.get(`/v1/employee/${employeeId}/overtime`, { params })
  const payload = data?.data ?? data ?? {}
  return normalizeOvertimePayload(payload)
}

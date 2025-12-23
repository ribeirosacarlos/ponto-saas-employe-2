<<<<<<< HEAD
// src/services/api.js (ou onde você estiver usando)

import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://yellowgreen-falcon-528249.hostingersite.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Interceptor pra anexar o Bearer token em todas as requisições autenticadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function loginRequest(email, password) {
  const { data } = await api.post('/v1/auth/login', { email, password })
  return {
    token: data.token || data?.data?.token,
    user: data.user || data?.data?.user,
    roles: data.roles || data?.data?.roles || [],
  }
}

export async function logoutRequest() {
  const { data } = await api.post('/v1/auth/logout')
  return data
}

export async function clockRequest(type, coords = {}) {
  const payload = { type }

  if (coords.latitude) payload.latitude = coords.latitude
  if (coords.longitude) payload.longitude = coords.longitude

  const { data } = await api.post('/v1/employee/clock', payload)
  return data
}

export async function getEmployeeEntries({ from, to, page = 1, perPage = 20 } = {}) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to

  // Envia ambas as variantes para compatibilidade com o backend.
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get('/v1/employee/entries', {
    params,
  })

  // TODO: align with API shape when backend is finalized
  const entries = Array.isArray(data) ? data : data?.data || data?.entries || []
  const meta =
    data?.meta ||
    (data && typeof data === 'object'
      ? {
          page: data.page || page,
          perPage: data.per_page || data.perPage || perPage,
          total: data.total,
          lastPage: data.last_page || data.lastPage,
        }
      : null)

  return { data: entries, meta }
}

export async function listEntries(page = 1) {
  const { data, meta } = await getEmployeeEntries({ page })
  return { data, meta }
}

export async function requestAdjustment(payload) {
  const { data } = await api.post('/v1/employee/adjustments', payload)
  return data
}

export async function breakRequest(action, coords = {}) {
  const isStart = action === 'start'
  const type = isStart ? 'break_start' : 'break_end'
  return clockRequest(type, coords)
}

export async function startBreak(coords = {}) {
  return breakRequest('start', coords)
}

export async function endBreak(coords = {}) {
  return breakRequest('end', coords)
}

export async function getWorkedToday() {
  const { data } = await api.get('/v1/employee/worked-today')
  const payload = data?.data || data || {}

  return {
    ...payload,
    workedMinutes: payload.worked_minutes ?? payload.workedMinutes,
    workedSeconds: payload.worked_seconds ?? payload.workedSeconds,
  }
}

export async function listEmployees(page = 1) {
  const params = {}
  if (page) params.page = page

  const { data } = await api.get('/v1/admin/employees', { params })
  const payload = data?.data ?? data
  const employees = Array.isArray(payload) ? payload : payload?.data || payload?.employees || []
  const meta =
    data?.meta ||
    payload?.meta ||
    (data && typeof data === 'object'
      ? {
          page: data.page ?? page,
          perPage: data.per_page ?? data.perPage,
          total: data.total,
          lastPage: data.last_page ?? data.lastPage,
        }
      : null)

  return { data: employees, meta }
}

export async function createEmployee(payload) {
  const { data } = await api.post('/v1/admin/employees', payload)
  return data?.data ?? data
}

export async function getEmployee(id) {
  const { data } = await api.get(`/v1/admin/employees/${id}`)
  return data?.data ?? data
}

export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/v1/admin/employees/${id}`, payload)
  return data?.data ?? data
}

export async function deleteEmployee(id) {
  const { data } = await api.delete(`/v1/admin/employees/${id}`)
  return data?.data ?? data
}

export async function assignEmployeeShift(id, payload) {
  const { data } = await api.post(`/v1/admin/employees/${id}/shift`, payload)
  return data?.data ?? data
}

export async function listShifts(page = 1) {
  const params = {}
  if (page) params.page = page

  const { data } = await api.get('/v1/admin/shifts', { params })
  const payload = data?.data ?? data
  const shifts = Array.isArray(payload) ? payload : payload?.data || payload?.shifts || []
  const meta =
    data?.meta ||
    payload?.meta ||
    (data && typeof data === 'object'
      ? {
          page: data.page ?? page,
          perPage: data.per_page ?? data.perPage,
          total: data.total,
          lastPage: data.last_page ?? data.lastPage,
        }
      : null)

  return { data: shifts, meta }
}
=======
export { api } from '../services/http/api'
export * from '../services'
>>>>>>> origin/main

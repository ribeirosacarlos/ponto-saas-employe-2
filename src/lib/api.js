import axios from 'axios'
import { attachForbiddenInterceptor } from './http/attachForbiddenInterceptor'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://api.jornafy.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

attachForbiddenInterceptor(api)

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

export async function meRequest() {
  const { data } = await api.get('/v1/auth/me')
  const payload = data?.data || data || {}
  return {
    user: payload.user || payload,
    roles: payload.roles || [],
  }
}

export async function clockRequest(type, coords = {}) {
  const allowedTypes = ['in', 'out']
  if (!allowedTypes.includes(type)) {
    throw new Error(`Unsupported clock type "${type}". API now only accepts: ${allowedTypes.join(', ')}`)
  }

  const payload = { type }

  if (coords.latitude) payload.latitude = coords.latitude
  if (coords.longitude) payload.longitude = coords.longitude

  const { data } = await api.post('/v1/employee/clock', payload)
  return data
}

const parseEntriesResponse = (data, { page, perPage }) => {
  const payload = data?.data && !Array.isArray(data.data) ? data.data : data
  const entries = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.entries)
        ? payload.entries
        : []

  const metaSource = data?.meta || payload?.meta || payload || {}
  const meta = {
    currentPage:
      metaSource.current_page ?? metaSource.currentPage ?? payload?.current_page ?? metaSource.page ?? page,
    perPage: metaSource.per_page ?? metaSource.perPage ?? payload?.per_page ?? perPage,
    total: metaSource.total ?? payload?.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage ?? payload?.last_page,
  }

  return { data: entries, meta }
}

const extractClockedAt = (entry) =>
  entry?.clocked_at ||
  entry?.clockedAt ||
  entry?.date ||
  entry?.timestamp ||
  entry?.created_at ||
  null

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

export async function getEmployeeEntries({
  from,
  to,
  page = 1,
  perPage = 20,
  preferLatestPage = true,
} = {}) {
  const buildParams = (pageValue) => {
    const params = {}
    if (pageValue) params.page = pageValue
    if (perPage) params.per_page = perPage
    if (from) params.from = from
    if (to) params.to = to
    return params
  }

  const fetchPage = async (pageValue) => {
    const { data } = await api.get('/v1/employee/entries', { params: buildParams(pageValue) })
    return { data, pageValue }
  }

  let response = await fetchPage(page)
  let parsed = parseEntriesResponse(response.data, { page, perPage })

  if (preferLatestPage && page === 1 && parsed.meta.lastPage && parsed.meta.lastPage > 1) {
    const today = new Date()
    const filterAllowsToday =
      (!from || new Date(from) <= today) && (!to || new Date(to) >= today)
    const hasTodayEntry =
      filterAllowsToday &&
      parsed.data.some((entry) => {
        const value = extractClockedAt(entry)
        if (!value) return false
        const dt = new Date(value)
        return !isNaN(dt) && isSameDay(dt, today)
      })

    // If the first page doesn't include today's records and there are more pages, fetch the last page.
    if (!hasTodayEntry && parsed.meta.currentPage === 1) {
      response = await fetchPage(parsed.meta.lastPage)
      parsed = parseEntriesResponse(response.data, { page: parsed.meta.lastPage, perPage })
    }
  }

  return parsed
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
  const actionLabel = action === 'start' ? 'start' : 'end'
  throw new Error(
    `Break clocking (${actionLabel}) is no longer supported by the API. Use regular in/out clocking instead.`,
  )
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

export async function getOpenTimeEntryStatus() {
  const { data } = await api.get('/v1/employee/time-entries/open-status')
  return data?.data ?? data
}

export async function getCurrentEmployeeShift() {
  const { data } = await api.get('/v1/employee/shift')
  return data?.data ?? data
}

export async function listEmployees(page = 1, filters = {}) {
  const params = {}
  if (page) params.page = page
  if (filters.perPage) params.per_page = filters.perPage
  if (filters.per_page) params.per_page = filters.per_page

  const { data } = await api.get('/v1/admin/employees', { params })
  const payload = data?.data ?? data
  const employees = Array.isArray(payload) ? payload : payload?.data || payload?.employees || []
  const metaSource = data?.meta || payload?.meta || data || {}
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

import { api } from '../services/http/api'
import { normalizeEntriesResponse } from './timesheet'


const ENTRIES_CACHE_MS = 15 * 1000 // 15s cache to squash duplicate rapid requests
const entriesCache = new Map()
const entriesInflight = new Map()

export async function loginRequest(email, password) {
  const { data } = await api.post('/v1/auth/login', { email, password }, { skipAuth: true })
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

// Deprecated: Use getCurrentUser from authService instead
export async function meRequest() {
  console.warn('meRequest is deprecated. Use getCurrentUser from authService instead.')
  const { data } = await api.get('/v1/auth/me')
  const payload = data?.data || data || {}
  return {
    user: payload.user || payload,
    roles: payload.roles || [],
  }
}

export async function clockRequest(typeOrCoords = {}, maybeCoords = {}) {
  const coords = typeof typeOrCoords === 'string' ? maybeCoords : typeOrCoords || {}
  const payload = {}

  if (Number.isFinite(Number(coords.latitude))) payload.latitude = Number(coords.latitude)
  if (Number.isFinite(Number(coords.longitude))) payload.longitude = Number(coords.longitude)
  if (coords.source) payload.source = coords.source

  const response = await api.post('/v1/employee/clock', payload)
  const { data: rawData, status: httpStatus } = response
  const payloadData = rawData?.data ?? rawData ?? {}

  return {
    status:
      httpStatus === 202 || payloadData.status === 'adjustment_requested'
        ? 'adjustment_requested'
        : 'created',
    httpStatus,
    entry:
      httpStatus === 201
        ? payloadData.entry ?? payloadData.time_entry ?? payloadData.entry_data ?? payloadData
        : null,
    next_event: payloadData.next_event ?? payloadData.nextEvent ?? null,
    adjustment: payloadData.adjustment ?? payloadData.adjustment_request ?? null,
    raw: payloadData,
  }
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
  forceRefresh = false,
} = {}) {
  const cacheKey = JSON.stringify({ from: from || null, to: to || null, page, perPage, preferLatestPage })

  if (!forceRefresh) {
    const cached = entriesCache.get(cacheKey)
    if (cached && Date.now() - cached.time < ENTRIES_CACHE_MS) {
      return cached.value
    }
    const inflight = entriesInflight.get(cacheKey)
    if (inflight) return inflight
  }

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

  const loadEntries = async () => {
    let response = await fetchPage(page)
    let parsed = normalizeEntriesResponse(response.data, { page, perPage })

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
        parsed = normalizeEntriesResponse(response.data, { page: parsed.meta.lastPage, perPage })
      }
    }

    entriesCache.set(cacheKey, { value: parsed, time: Date.now() })
    return parsed
  }

  const promise = loadEntries()
  entriesInflight.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    entriesInflight.delete(cacheKey)
  }
}

export async function listEntries(page = 1) {
  const { data, days, meta } = await getEmployeeEntries({ page })
  return { data, days, meta }
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

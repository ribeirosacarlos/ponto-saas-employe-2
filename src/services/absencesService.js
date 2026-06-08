import { api } from './http/api'

export const ABSENCE_ENDPOINTS = {
  employee: {
    list: null,
    today: null,
  },
  admin: {
    create: '/v1/admin/absences',
    list: null,
    update: null,
    remove: null,
  },
}

const WARNED = new Set()

const warnOnce = (key, message) => {
  if (WARNED.has(key)) return
  WARNED.add(key)
  console.warn(message)
}

export const isAbsenceServiceConfigured = () =>
  Object.values(ABSENCE_ENDPOINTS.employee).some(Boolean) ||
  Object.values(ABSENCE_ENDPOINTS.admin).some(Boolean)

const normalizeListResponse = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.absences)
        ? payload.absences
        : []
  const metaSource = data?.meta || payload?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { items, meta }
}

export async function listEmployeeAbsences({ from, to, page = 1, perPage = 20 } = {}) {
  if (!ABSENCE_ENDPOINTS.employee.list) {
    warnOnce('absence-list', '[absencesService] Missing employee absences list endpoint.')
    return { data: [], meta: null }
  }

  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get(ABSENCE_ENDPOINTS.employee.list, { params })
  const { items, meta } = normalizeListResponse(data, page)
  return { data: items, meta }
}

export async function listAbsencesByUser({ userId, from, to, page = 1, perPage = 20 } = {}) {
  if (!userId) return { data: [], meta: null }
  // TODO: wire admin absences list endpoint when backend is ready.
  warnOnce('absence-admin-list', '[absencesService] Missing admin absences list endpoint.')
  return { data: [], meta: null }
}

export async function getAbsenceToday() {
  if (!ABSENCE_ENDPOINTS.employee.today) {
    warnOnce('absence-today', '[absencesService] Missing absence-today endpoint.')
    return null
  }

  const { data } = await api.get(ABSENCE_ENDPOINTS.employee.today)
  return data?.data ?? data
}

export async function createAbsence(payload = {}) {
  const { data } = await api.post(ABSENCE_ENDPOINTS.admin.create, payload)
  return data?.data ?? data
}

export async function listAdminTimeEntries({ start, end, page } = {}) {
  const params = {}
  if (start) params.start = start
  if (end) params.end = end
  if (page) params.page = page

  if (!params.start || !params.end) {
    return { data: [], meta: null }
  }

  const { data } = await api.get('/v1/admin/reports/time', { params })
  const { items, meta } = normalizeListResponse(data, page || 1)
  return { data: items, meta }
}

export async function hasEmployeePresenceOnDate({ userId, date }) {
  if (!userId || !date) return false
  const { data } = await listAdminTimeEntries({ start: date, end: date })
  return (data || []).some((entry) => {
    const entryUserId =
      entry.user_id ?? entry.userId ?? entry.employee_id ?? entry.employeeId ?? entry.user?.id
    return String(entryUserId) === String(userId)
  })
}

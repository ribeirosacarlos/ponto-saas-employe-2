import { api } from '../http/api'

const EMPLOYEE_BASE = '/v1/employee/announcements'
const ADMIN_BASE = '/v1/admin/announcements'

const normalizePaginatedResponse = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.announcements)
        ? payload.announcements
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

export async function listEmployeeAnnouncements({ from, to, status, page = 1, perPage } = {}) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (status) params.status = status
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get(EMPLOYEE_BASE, { params })
  const { items, meta } = normalizePaginatedResponse(data, page)
  return { data: items, meta }
}

export async function getEmployeeAnnouncement(id) {
  if (!id) return null
  const { data } = await api.get(`${EMPLOYEE_BASE}/${id}`)
  return data?.data ?? data
}

export async function markEmployeeAnnouncementSeen(id) {
  if (!id) return null
  const { data } = await api.post(`${EMPLOYEE_BASE}/${id}/seen`)
  return data?.data ?? data
}

export async function getEmployeeAnnouncementsPendingCount() {
  const { data } = await api.get(`${EMPLOYEE_BASE}/pending-count`)
  return data?.data ?? data
}

export async function listAdminAnnouncements({ from, to, type, query, page = 1, perPage } = {}) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (type) params.type = type
  if (query) params.query = query
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get(ADMIN_BASE, { params })
  const { items, meta } = normalizePaginatedResponse(data, page)
  return { data: items, meta }
}

export async function createAdminAnnouncement(payload = {}) {
  const { data } = await api.post(ADMIN_BASE, payload)
  return data?.data ?? data
}

export async function getAdminAnnouncement(id) {
  if (!id) return null
  const { data } = await api.get(`${ADMIN_BASE}/${id}`)
  return data?.data ?? data
}

export async function updateAdminAnnouncement(id, payload = {}) {
  if (!id) return null
  const { data } = await api.put(`${ADMIN_BASE}/${id}`, payload)
  return data?.data ?? data
}

export async function patchAdminAnnouncement(id, payload = {}) {
  if (!id) return null
  const { data } = await api.patch(`${ADMIN_BASE}/${id}`, payload)
  return data?.data ?? data
}

export async function deleteAdminAnnouncement(id) {
  if (!id) return null
  const { data } = await api.delete(`${ADMIN_BASE}/${id}`)
  return data?.data ?? data
}

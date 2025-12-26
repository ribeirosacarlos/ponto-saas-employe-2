import {
  getEmployeeAnnouncement,
  getEmployeeAnnouncementsPendingCount,
  listEmployeeAnnouncements,
  markEmployeeAnnouncementSeen,
  listAdminAnnouncements as listAdminAnnouncementsApi,
  createAdminAnnouncement as createAdminAnnouncementApi,
  getAdminAnnouncement as getAdminAnnouncementApi,
  updateAdminAnnouncement as updateAdminAnnouncementApi,
  patchAdminAnnouncement as patchAdminAnnouncementApi,
  deleteAdminAnnouncement as deleteAdminAnnouncementApi,
} from './modules/announcements'

export const ANNOUNCEMENT_ENDPOINTS = {
  employee: {
    list: '/v1/employee/announcements',
    detail: (id) => `/v1/employee/announcements/${id}`,
    markSeen: (id) => `/v1/employee/announcements/${id}/seen`,
    pendingCount: '/v1/employee/announcements/pending-count',
  },
  admin: {
    list: '/v1/admin/announcements',
    detail: (id) => `/v1/admin/announcements/${id}`,
    create: '/v1/admin/announcements',
    update: (id) => `/v1/admin/announcements/${id}`,
    remove: (id) => `/v1/admin/announcements/${id}`,
  },
}

const WARNED = new Set()

const warnOnce = (key, message) => {
  if (WARNED.has(key)) return
  WARNED.add(key)
  console.warn(message)
}

const DEFAULT_MOCK_ANNOUNCEMENTS = [
  {
    id: 'hybrid-update',
    title: 'Hybrid work update',
    body: 'Starting next month, teams will alternate office and remote days. Please review the new schedule.',
    sent_at: '2025-08-12T17:42:00-03:00',
    sender_role: 'admin',
  },
  {
    id: 'security-policy',
    title: 'Security policy revised',
    body: 'Review the new MFA guidance and update your passwords before the end of the month.',
    sent_at: '2025-08-10T09:15:00-03:00',
    seen_at: '2025-08-10T10:02:00-03:00',
    sender_role: 'area_manager',
  },
]

const normalizeListResponse = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.announcements)
        ? payload.announcements
        : Array.isArray(payload?.items)
          ? payload.items
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

const normalizeText = (value) => (value ? String(value).replace(/\s+/g, ' ').trim() : '')

const buildSummary = (value, limit = 160) => {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit - 3)}...`
}

export const normalizeAnnouncement = (announcement = {}, index = 0) => {
  const payload = announcement || {}
  const body =
    payload.body ??
    payload.content ??
    payload.message ??
    payload.text ??
    payload.description ??
    ''
  const summary =
    payload.summary ??
    payload.excerpt ??
    payload.preview ??
    payload.short_description ??
    payload.shortDescription ??
    payload.subtitle ??
    ''

  const sentAt =
    payload.sent_at ??
    payload.sentAt ??
    payload.created_at ??
    payload.createdAt ??
    payload.published_at ??
    payload.publishedAt ??
    payload.date ??
    payload.sent_on ??
    payload.sentOn ??
    ''
  const seenAt =
    payload.seen_at ??
    payload.seenAt ??
    payload.viewed_at ??
    payload.viewedAt ??
    payload.read_at ??
    payload.readAt ??
    payload.confirmed_at ??
    payload.confirmedAt ??
    ''
  const statusRaw = String(payload.status ?? payload.state ?? '').toLowerCase()
  const isSeen = Boolean(
    seenAt ||
      payload.seen ||
      payload.is_seen ||
      payload.viewed ||
      payload.read ||
      statusRaw === 'seen' ||
      statusRaw === 'read' ||
      statusRaw === 'viewed',
  )

  const sender = payload.sender ?? payload.author ?? payload.from ?? payload.created_by ?? payload.owner ?? null
  const senderName =
    payload.sender_name ??
    payload.senderName ??
    payload.author_name ??
    payload.authorName ??
    payload.from_name ??
    payload.fromName ??
    sender?.name ??
    sender?.full_name ??
    sender?.fullName ??
    sender?.title ??
    ''
  const senderRole =
    payload.sender_role ??
    payload.senderRole ??
    payload.sender_type ??
    payload.senderType ??
    sender?.role ??
    sender?.type ??
    ''

  return {
    ...payload,
    id: payload.id ?? payload.uuid ?? payload.announcement_id ?? payload.announcementId ?? `announcement-${index}`,
    title: payload.title ?? payload.subject ?? payload.name ?? 'Announcement',
    summary: buildSummary(summary || body),
    body: normalizeText(body) || normalizeText(summary),
    senderName,
    senderRole,
    sentAt,
    seenAt: isSeen ? seenAt || null : null,
    status: isSeen ? 'seen' : 'pending',
  }
}

export const isAnnouncementsServiceConfigured = () =>
  Object.values(ANNOUNCEMENT_ENDPOINTS.employee).some(Boolean) ||
  Object.values(ANNOUNCEMENT_ENDPOINTS.admin).some(Boolean)

export async function listAnnouncements({ fallback, from, to, status, page, perPage } = {}) {
  if (!ANNOUNCEMENT_ENDPOINTS.employee.list) {
    warnOnce('announcements-list', '[announcementsService] Missing list endpoint.')
    const items = fallback?.length ? fallback : DEFAULT_MOCK_ANNOUNCEMENTS
    return items.map(normalizeAnnouncement)
  }

  const response = await listEmployeeAnnouncements({ from, to, status, page, perPage })
  const { items } = normalizeListResponse(response)
  return items.map(normalizeAnnouncement)
}

export async function getAnnouncement(id, { fallback } = {}) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.employee.detail) {
    warnOnce('announcements-detail', '[announcementsService] Missing detail endpoint.')
    const items = fallback?.length ? fallback : DEFAULT_MOCK_ANNOUNCEMENTS
    const match = items.find((item) => String(item.id) === String(id))
    return match ? normalizeAnnouncement(match) : null
  }

  const data = await getEmployeeAnnouncement(id)
  return normalizeAnnouncement(data)
}

export async function markAnnouncementSeen(id) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.employee.markSeen) {
    warnOnce('announcements-seen', '[announcementsService] Missing mark-seen endpoint.')
    const now = new Date().toISOString()
    return { id, seen_at: now, seenAt: now }
  }

  return markEmployeeAnnouncementSeen(id)
}

export async function listPendingCount() {
  if (!ANNOUNCEMENT_ENDPOINTS.employee.pendingCount) {
    warnOnce('announcements-pending-count', '[announcementsService] Missing pending-count endpoint.')
    return null
  }

  return getEmployeeAnnouncementsPendingCount()
}

export async function listAdminAnnouncements({ from, to, type, query, page, perPage } = {}) {
  if (!ANNOUNCEMENT_ENDPOINTS.admin.list) {
    warnOnce('admin-announcements-list', '[announcementsService] Missing admin list endpoint.')
    return { data: [], meta: null }
  }

  const response = await listAdminAnnouncementsApi({ from, to, type, query, page, perPage })
  const { items, meta } = normalizeListResponse(response)
  return { data: items.map(normalizeAnnouncement), meta }
}

export async function createAdminAnnouncement(payload = {}) {
  if (!ANNOUNCEMENT_ENDPOINTS.admin.create) {
    warnOnce('admin-announcements-create', '[announcementsService] Missing admin create endpoint.')
    return null
  }
  return createAdminAnnouncementApi(payload)
}

export async function getAdminAnnouncement(id) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.admin.detail) {
    warnOnce('admin-announcements-detail', '[announcementsService] Missing admin detail endpoint.')
    return null
  }

  const data = await getAdminAnnouncementApi(id)
  return normalizeAnnouncement(data)
}

export async function updateAdminAnnouncement(id, payload = {}) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.admin.update) {
    warnOnce('admin-announcements-update', '[announcementsService] Missing admin update endpoint.')
    return null
  }
  return updateAdminAnnouncementApi(id, payload)
}

export async function patchAdminAnnouncement(id, payload = {}) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.admin.update) {
    warnOnce('admin-announcements-patch', '[announcementsService] Missing admin patch endpoint.')
    return null
  }
  return patchAdminAnnouncementApi(id, payload)
}

export async function deleteAdminAnnouncement(id) {
  if (!id) return null
  if (!ANNOUNCEMENT_ENDPOINTS.admin.remove) {
    warnOnce('admin-announcements-remove', '[announcementsService] Missing admin remove endpoint.')
    return null
  }
  return deleteAdminAnnouncementApi(id)
}

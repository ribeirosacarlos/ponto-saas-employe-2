import { api } from './http/api'

const normalizeAdjustment = (item = {}, index = 0) => {
  const status = (item.status ?? item.state ?? '').toString().toLowerCase()

  return {
    ...item,
    id: item.id ?? item.uuid ?? `adjustment-${index}`,
    companyId: item.company_id ?? item.companyId ?? null,
    userId: item.user_id ?? item.userId ?? item.employee_id ?? item.employeeId ?? null,
    approverId: item.approver_id ?? item.approverId ?? null,
    originalTime: item.original_time ?? item.originalTime ?? item.original ?? null,
    correctedTime: item.corrected_time ?? item.correctedTime ?? item.corrected ?? null,
    reason: item.reason ?? item.justification ?? item.notes ?? '',
    status,
    createdAt: item.created_at ?? item.createdAt ?? null,
    updatedAt: item.updated_at ?? item.updatedAt ?? null,
    user: item.user ?? item.employee ?? null,
    approver: item.approver ?? null,
  }
}

const normalizeTeamEntry = (entry = {}, index = 0) => ({
  ...entry,
  id: entry.id ?? entry.uuid ?? `team-entry-${index}`,
  userId: entry.user_id ?? entry.userId ?? entry.employee_id ?? null,
  clockedAt: entry.clocked_at ?? entry.clockedAt ?? entry.date ?? entry.timestamp ?? null,
  type: entry.type ?? entry.event_type ?? entry.kind ?? entry.status ?? '',
  latitude: entry.latitude ?? null,
  longitude: entry.longitude ?? null,
  source: entry.source ?? entry.origin ?? entry.channel ?? '',
  user: entry.user ?? entry.employee ?? null,
})

const normalizePaginated = (data, fallbackPage = 1, fallbackPerPage) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  const metaSource = data?.meta || payload?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage ?? fallbackPerPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { items, meta }
}

export async function listAdminAdjustments({ status, userId, page = 1, perPage = 15 } = {}) {
  const params = {}
  if (status) params.status = status
  if (userId) params.user_id = userId
  if (page) params.page = page
  if (perPage) params.per_page = perPage

  const { data } = await api.get('/v1/area-manager/adjustments', { params })
  const { items, meta } = normalizePaginated(data, page, perPage)
  return { data: items.map((item, index) => normalizeAdjustment(item, index)), meta }
}

export async function approveAdminAdjustment(id) {
  if (!id) return null
  const { data } = await api.post(`/v1/area-manager/adjustments/${id}/approve`)
  return normalizeAdjustment(data?.data ?? data ?? {}, 0)
}

export async function rejectAdminAdjustment(id) {
  if (!id) return null
  const { data } = await api.post(`/v1/area-manager/adjustments/${id}/reject`)
  return normalizeAdjustment(data?.data ?? data ?? {}, 0)
}

export async function listTeamEntries({
  page = 1,
  perPage,
  userId,
  dateFrom,
  dateTo,
  type,
} = {}) {
  const params = {}
  if (page) params.page = page
  if (perPage) params.per_page = perPage
  if (userId) params.user_id = userId
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (type) params.type = type

  const { data } = await api.get('/v1/area-manager/team/entries', { params })
  const { items, meta } = normalizePaginated(data, page, perPage)
  return { data: items.map((entry, index) => normalizeTeamEntry(entry, index)), meta }
}

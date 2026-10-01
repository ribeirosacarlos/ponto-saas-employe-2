import { api } from './http/api'
import { normalizeEntriesResponse, normalizeOvertimePayload, normalizeTimesheetSummary } from '../lib/timesheet'

const normalizeProposedType = (value) => {
  if (value === undefined || value === null) return null
  const normalized = String(value).toLowerCase()
  return normalized === 'in' || normalized === 'out' ? normalized : null
}

const firstPresentValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.trim() === '') continue
    return value
  }
  return null
}

const normalizeAdjustment = (item = {}, index = 0) => {
  const status = (item.adjustment_status ?? item.status ?? item.state ?? '').toString().toLowerCase()

  return {
    ...item,
    id: item.id ?? item.uuid ?? `adjustment-${index}`,
    companyId: item.company_id ?? item.companyId ?? null,
    userId: item.user_id ?? item.userId ?? item.employee_id ?? item.employeeId ?? null,
    approverId: item.approver_id ?? item.approverId ?? null,
    originalTime: firstPresentValue(
      item.clocked_at,
      item.original_time,
      item.originalTime,
      item.original,
    ),
    correctedTime: firstPresentValue(
      item.proposed_clocked_at,
      item.proposedClockedAt,
      item.corrected_time,
      item.correctedTime,
      item.corrected,
      item.clocked_at,
      item.original_time,
      item.originalTime,
      item.original,
    ),
    proposedType: normalizeProposedType(item.proposed_type ?? item.proposedType ?? item.type ?? null),
    reason: item.adjustment_reason ?? item.reason ?? item.justification ?? item.notes ?? '',
    reviewReason: item.adjustment_review_reason ?? item.review_reason ?? item.reviewReason ?? '',
    status,
    createdAt: item.adjustment_requested_at ?? item.created_at ?? item.createdAt ?? null,
    updatedAt: item.updated_at ?? item.updatedAt ?? null,
    user: item.user ?? item.employee ?? null,
    approver: item.approver ?? null,
  }
}

const normalizeTeamEntry = (entry = {}, index = 0) => ({
  ...entry,
  id: entry.id ?? entry.uuid ?? `team-entry-${index}`,
  timeEntryId: entry.id ?? entry.time_entry_id ?? entry.timeEntryId ?? entry.uuid ?? null,
  userId: entry.user_id ?? entry.userId ?? entry.employee_id ?? null,
  clockedAt: entry.clocked_at ?? entry.clockedAt ?? entry.date ?? entry.timestamp ?? null,
  type: entry.type ?? entry.event_type ?? entry.kind ?? entry.status ?? '',
  latitude: entry.latitude ?? null,
  longitude: entry.longitude ?? null,
  source: entry.source ?? entry.origin ?? entry.channel ?? '',
  workDate: entry.work_date ?? entry.workDate ?? null,
  daySummary:
    normalizeTimesheetSummary(
      entry.day_summary ??
        entry.daySummary ??
        entry.summary ??
        entry.daily_summary ??
        entry.dailySummary ??
        null,
    ),
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
  const { data } = await api.post(`/v1/admin/time-entries/${id}/adjustment/approve`)
  return normalizeAdjustment(data?.data ?? data ?? {}, 0)
}

export async function rejectAdminAdjustment(id) {
  if (!id) return null
  const { data } = await api.post(`/v1/admin/time-entries/${id}/adjustment/reject`)
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
  const parsed = normalizeEntriesResponse(data, { page, perPage })
  return {
    data: parsed.data.map((entry, index) => normalizeTeamEntry(entry, index)),
    days: parsed.days,
    meta: parsed.meta,
    groupedByDay: parsed.groupedByDay,
  }
}

export async function getTeamOvertimeBalance(
  employeeId,
  { from = undefined, to = undefined, isAdmin = false, includeDays = false } = {},
) {
  if (!employeeId) throw new Error('employeeId is required')
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (includeDays !== undefined) params.include_days = includeDays ? 1 : 0
  const path = isAdmin
    ? `/v1/admin/employees/${employeeId}/overtime`
    : `/v1/area-manager/team/${employeeId}/overtime`
  const { data } = await api.get(path, { params })
  return normalizeOvertimePayload(data?.data ?? data ?? {})
}

export async function deleteTimeEntry(timeEntryId) {
  if (!timeEntryId) return null
  const { data } = await api.delete(`/v1/admin/time-entries/${timeEntryId}`, {
    skipAccessDeniedHandling: true,
  })
  return data?.data ?? data ?? null
}

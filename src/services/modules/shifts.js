import { api } from '../http/api'

const BASE = '/v1/admin/shifts'

const toHHmm = (value) => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (!str) return null
  const [hours = '', minutes = '00'] = str.split(':')
  if (hours === '' && minutes === '') return null
  const hNum = Number.parseInt(hours, 10)
  const mNum = Number.parseInt(minutes, 10)
  if (!Number.isFinite(hNum) || !Number.isFinite(mNum)) return null
  const h = String(hNum).padStart(2, '0').slice(-2)
  const m = String(mNum).padStart(2, '0').slice(0, 2)
  return `${h}:${m}`
}

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(lower)) return true
    if (['false', '0', 'no', 'off', ''].includes(lower)) return false
    const asNumber = Number(lower)
    if (Number.isFinite(asNumber)) return asNumber !== 0
  }
  return Boolean(value)
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeShiftEvent = (event = {}, index = 0) => ({
  id: event.id ?? event.uuid ?? `event-${index}`,
  kind: event.kind ?? event.type ?? event.event ?? '',
  expected_time: event.expected_time ?? event.expectedTime ?? event.expected_at ?? event.expectedAt ?? '',
  expected_type: event.expected_type ?? event.expectedType ?? event.type ?? '',
  day_offset: Number(event.day_offset ?? event.dayOffset ?? 0),
  sort_order: Number(event.sort_order ?? event.sortOrder ?? index),
})

const normalizeOutgoingDay = (day = {}, index = 0) => {
  const working = toBoolean(
    day.is_working_day ?? day.isWorkingDay ?? day.working_day ?? day.workingDay ?? false,
  )
  const isWorking = Boolean(working)

  return {
    weekday: Number(day.weekday ?? day.day ?? index + 1),
    is_working_day: isWorking,
    start_time: working ? toHHmm(day.start_time ?? day.startTime ?? day.start ?? '') || null : null,
    end_time: working ? toHHmm(day.end_time ?? day.endTime ?? day.end ?? '') || null : null,
    break_start_time: working
      ? toHHmm(day.break_start_time ?? day.breakStartTime ?? day.breakStart ?? '') || null
      : null,
    break_end_time: working
      ? toHHmm(day.break_end_time ?? day.breakEndTime ?? day.breakEnd ?? '') || null
      : null,
    break_minutes: working ? toNumberOrNull(day.break_minutes ?? day.breakMinutes ?? day.breakDuration) : null,
  }
}

const sanitizeShiftPayload = (payload = {}) => {
  const base = { ...payload }
  base.start_time = toHHmm(payload.start_time ?? payload.startTime ?? '') || null
  base.end_time = toHHmm(payload.end_time ?? payload.endTime ?? '') || null
  base.is_working_day = undefined

  const sourceDays = payload.days ?? payload.shift_days ?? []
  const normalizedDays = Array.isArray(sourceDays)
    ? sourceDays.map((day, index) => normalizeOutgoingDay(day, index))
    : []

  base.days = normalizedDays
  base.shift_days = normalizedDays

  return base
}

const normalizeShiftDay = (day = {}, index = 0) => ({
  weekday: Number(day.weekday ?? day.day ?? index + 1),
  is_working_day:
    day.is_working_day ?? day.isWorkingDay ?? day.working_day ?? day.workingDay ?? false,
  start_time: toHHmm(day.start_time ?? day.startTime ?? day.start ?? ''),
  end_time: toHHmm(day.end_time ?? day.endTime ?? day.end ?? ''),
  break_start_time: toHHmm(day.break_start_time ?? day.breakStartTime ?? day.breakStart ?? ''),
  break_end_time: toHHmm(day.break_end_time ?? day.breakEndTime ?? day.breakEnd ?? ''),
  break_minutes: day.break_minutes ?? day.breakMinutes ?? day.breakDuration ?? null,
  events: Array.isArray(day.events) ? day.events.map((event, idx) => normalizeShiftEvent(event, idx)) : [],
})

const normalizeShift = (shift = {}, index = 0) => ({
  id: shift?.id ?? shift?.uuid ?? shift?.shift_id ?? `shift-${index}`,
  name: shift?.name ?? shift?.title ?? shift?.label ?? '',
  start_time: toHHmm(shift?.start_time ?? shift?.startTime ?? ''),
  end_time: toHHmm(shift?.end_time ?? shift?.endTime ?? ''),
  is_flexible: Boolean(shift?.is_flexible ?? shift?.flexible ?? shift?.isFlexible),
  is_default: Boolean(shift?.is_default ?? shift?.default ?? shift?.isDefault),
  shift_days: (shift?.shift_days ?? shift?.days ?? []).map((day, dayIndex) =>
    normalizeShiftDay(day, dayIndex),
  ),
})

const normalizePaginated = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.shifts)
        ? payload.shifts
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

export async function listShifts({ page = 1, perPage } = {}) {
  const params = {}
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get(BASE, { params })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((shift, index) => normalizeShift(shift, index)), meta }
}

export async function createShift(payload = {}) {
  const sanitized = sanitizeShiftPayload(payload)
  const { data } = await api.post(BASE, sanitized)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function getShift(id) {
  if (!id) return null
  const { data } = await api.get(`${BASE}/${id}`)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function updateShift(id, payload = {}) {
  if (!id) return null
  const sanitized = sanitizeShiftPayload(payload)
  const { data } = await api.put(`${BASE}/${id}`, sanitized)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function deleteShift(id) {
  if (!id) return null
  const { data } = await api.delete(`${BASE}/${id}`)
  return data?.data ?? data ?? { id }
}

export async function getCurrentEmployeeShift() {
  const { data } = await api.get('/v1/employee/shift')
  const payload = data?.data ?? data ?? {}
  const shift = payload?.shift ?? payload
  const assignment = payload?.assignment ?? null

  return {
    shift: shift ? normalizeShift(shift, 0) : null,
    assignment,
  }
}

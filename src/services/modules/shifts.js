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
  }
  return Boolean(value)
}

const toIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const hasValue = (value) => value !== null && value !== undefined && value !== ''

const normalizeShiftEvent = (event = {}, index = 0) => ({
  id: event.id ?? event.uuid ?? `event-${index}`,
  kind: event.kind ?? event.type ?? event.event ?? '',
  expected_time: event.expected_time ?? event.expectedTime ?? event.expected_at ?? event.expectedAt ?? '',
  expected_type: event.expected_type ?? event.expectedType ?? event.type ?? '',
  day_offset: Number(event.day_offset ?? event.dayOffset ?? 0),
  sort_order: Number(event.sort_order ?? event.sortOrder ?? index),
})

const normalizeShiftDay = (day = {}, index = 0) => ({
  weekday: Number(day.weekday ?? day.day ?? index + 1),
  is_working_day: toBoolean(
    day.is_working_day ?? day.isWorkingDay ?? day.working_day ?? day.workingDay ?? false,
  ),
  start_time: toHHmm(day.start_time ?? day.startTime ?? day.start ?? ''),
  end_time: toHHmm(day.end_time ?? day.endTime ?? day.end ?? ''),
  scheduled_minutes: toIntegerOrNull(
    day.scheduled_minutes ?? day.scheduledMinutes ?? day.planned_minutes ?? day.plannedMinutes,
  ),
  break_start_time: toHHmm(day.break_start_time ?? day.breakStartTime ?? day.breakStart ?? ''),
  break_end_time: toHHmm(day.break_end_time ?? day.breakEndTime ?? day.breakEnd ?? ''),
  break_minutes: toIntegerOrNull(day.break_minutes ?? day.breakMinutes ?? day.breakDuration),
  events: Array.isArray(day.events) ? day.events.map((event, idx) => normalizeShiftEvent(event, idx)) : [],
})

const normalizeShift = (shift = {}, index = 0) => ({
  id: shift?.id ?? shift?.uuid ?? shift?.shift_id ?? `shift-${index}`,
  company_id: shift?.company_id ?? shift?.companyId ?? null,
  name: shift?.name ?? '',
  start_time: toHHmm(shift?.start_time ?? shift?.startTime ?? ''),
  end_time: toHHmm(shift?.end_time ?? shift?.endTime ?? ''),
  is_flexible: toBoolean(shift?.is_flexible ?? shift?.flexible ?? shift?.isFlexible ?? false),
  is_default: toBoolean(shift?.is_default ?? shift?.default ?? shift?.isDefault ?? false),
  shift_days: (shift?.shift_days ?? shift?.days ?? []).map((day, dayIndex) =>
    normalizeShiftDay(day, dayIndex),
  ),
})

const serializeShiftDayForApi = (day = {}, index = 0) => {
  const weekday = Number(day.weekday ?? index + 1)
  const isWorkingDay = toBoolean(day.is_working_day ?? day.isWorkingDay ?? false)

  if (!isWorkingDay) {
    return {
      weekday,
      is_working_day: false,
    }
  }

  const startTime = toHHmm(day.start_time ?? day.startTime ?? '')
  const endTime = toHHmm(day.end_time ?? day.endTime ?? '')
  const scheduledMinutes = toIntegerOrNull(day.scheduled_minutes ?? day.scheduledMinutes)
  const breakStartTime = toHHmm(day.break_start_time ?? day.breakStartTime ?? '')
  const breakEndTime = toHHmm(day.break_end_time ?? day.breakEndTime ?? '')
  const breakMinutes = toIntegerOrNull(day.break_minutes ?? day.breakMinutes)

  const payloadDay = {
    weekday,
    is_working_day: true,
    start_time: startTime,
    end_time: endTime,
  }

  if (hasValue(scheduledMinutes)) {
    payloadDay.scheduled_minutes = scheduledMinutes
  }

  if (breakStartTime && breakEndTime) {
    payloadDay.break_start_time = breakStartTime
    payloadDay.break_end_time = breakEndTime
  }

  if (hasValue(breakMinutes)) {
    payloadDay.break_minutes = breakMinutes
  }

  return payloadDay
}

const serializeShiftPayloadForApi = (payload = {}) => {
  const result = {}

  if (hasValue(payload.name)) {
    result.name = String(payload.name).trim()
  }

  if (typeof payload.is_flexible === 'boolean') {
    result.is_flexible = payload.is_flexible
  }

  if (typeof payload.is_default === 'boolean') {
    result.is_default = payload.is_default
  }

  if (Array.isArray(payload.days)) {
    result.days = payload.days.map((day, index) => serializeShiftDayForApi(day, index))
  }

  return result
}

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
  if (perPage) params.per_page = perPage

  const { data } = await api.get(BASE, { params })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((shift, index) => normalizeShift(shift, index)), meta }
}

export async function createShift(payload = {}) {
  const { data } = await api.post(BASE, serializeShiftPayloadForApi(payload))
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function getShift(id) {
  if (!id) return null
  const { data } = await api.get(`${BASE}/${id}`)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function updateShift(id, payload = {}) {
  if (!id) return null
  const { data } = await api.put(`${BASE}/${id}`, serializeShiftPayloadForApi(payload))
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

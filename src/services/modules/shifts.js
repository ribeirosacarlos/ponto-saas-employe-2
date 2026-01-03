import { api } from '../http/api'

const BASE = '/v1/admin/shifts'

const normalizeShiftDay = (day = {}, index = 0) => ({
  weekday: Number(day.weekday ?? day.day ?? index + 1),
  is_working_day:
    day.is_working_day ?? day.isWorkingDay ?? day.working_day ?? day.workingDay ?? false,
  start_time: day.start_time ?? day.startTime ?? day.start ?? '',
  end_time: day.end_time ?? day.endTime ?? day.end ?? '',
  break_start_time: day.break_start_time ?? day.breakStartTime ?? day.breakStart ?? '',
  break_end_time: day.break_end_time ?? day.breakEndTime ?? day.breakEnd ?? '',
  break_minutes: day.break_minutes ?? day.breakMinutes ?? day.breakDuration ?? null,
})

const normalizeShift = (shift = {}, index = 0) => ({
  id: shift?.id ?? shift?.uuid ?? shift?.shift_id ?? `shift-${index}`,
  name: shift?.name ?? shift?.title ?? shift?.label ?? '',
  start_time: shift?.start_time ?? shift?.startTime ?? '',
  end_time: shift?.end_time ?? shift?.endTime ?? '',
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
  const { data } = await api.post(BASE, payload)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function getShift(id) {
  if (!id) return null
  const { data } = await api.get(`${BASE}/${id}`)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function updateShift(id, payload = {}) {
  if (!id) return null
  const { data } = await api.put(`${BASE}/${id}`, payload)
  return normalizeShift(data?.data ?? data ?? {}, 0)
}

export async function deleteShift(id) {
  if (!id) return null
  const { data } = await api.delete(`${BASE}/${id}`)
  return data?.data ?? data ?? { id }
}

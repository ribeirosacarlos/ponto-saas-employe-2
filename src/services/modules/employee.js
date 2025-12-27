import { api } from '../http/api'

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

export async function getEmployeeEntries({ from, to, page = 1, perPage = 20 } = {}) {
  const params = {}
  if (page) params.page = page

  const { data } = await api.get('/v1/employee/entries', {
    params,
  })

  const entries = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.entries)
        ? data.entries
        : []

  const metaSource = data?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? page,
    perPage: metaSource.per_page ?? metaSource.perPage ?? perPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { data: entries, meta }
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

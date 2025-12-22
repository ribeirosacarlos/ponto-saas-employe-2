import { api } from '../http/api'

export async function clockRequest(type, coords = {}) {
  const payload = { type }

  if (coords.latitude) payload.latitude = coords.latitude
  if (coords.longitude) payload.longitude = coords.longitude

  const { data } = await api.post('/v1/employee/clock', payload)
  return data
}

export async function getEmployeeEntries({ from, to, page = 1, perPage = 20 } = {}) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (page) params.page = page
  if (perPage) {
    params.per_page = perPage
    params.perPage = perPage
  }

  const { data } = await api.get('/v1/employee/entries', {
    params,
  })

  const entries = Array.isArray(data) ? data : data?.data || data?.entries || []
  const meta =
    data?.meta ||
    (data && typeof data === 'object'
      ? {
          page: data.page || page,
          perPage: data.per_page || data.perPage || perPage,
          total: data.total,
          lastPage: data.last_page || data.lastPage,
        }
      : null)

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
  const isStart = action === 'start'
  const type = isStart ? 'break_start' : 'break_end'
  return clockRequest(type, coords)
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

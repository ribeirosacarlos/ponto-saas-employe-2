import { api } from '../http/api'

export async function listEmployees(page = 1, filters = {}) {
  const params = {}
  if (page) params.page = page
  if (filters.perPage) params.per_page = filters.perPage
  if (filters.per_page) params.per_page = filters.per_page

  const { data } = await api.get('/v1/admin/employees', { params })

  const employees = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.employees)
      ? data.employees
      : Array.isArray(data)
        ? data
      : []

  const metaSource = data?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? page,
    perPage: metaSource.per_page ?? metaSource.perPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { data: employees, meta }
}

export async function createEmployee(payload) {
  const { data } = await api.post('/v1/admin/employees', payload)
  return data?.data || data
}

export async function getEmployee(id) {
  const { data } = await api.get(`/v1/admin/employees/${id}`)
  return data?.data || data
}

export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/v1/admin/employees/${id}`, payload)
  return data?.data || data
}

export async function deleteEmployee(id) {
  const { data } = await api.delete(`/v1/admin/employees/${id}`)
  return data?.data || data
}

export async function assignEmployeeShift(id, payload) {
  const { data } = await api.post(`/v1/admin/employees/${id}/shift`, payload)
  return data?.data || data
}

export async function getEmployeeOvertimeBalance(employeeId, { from, to, includeDays } = {}) {
  if (!employeeId) {
    throw new Error('employeeId is required to fetch overtime balance')
  }

  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (includeDays !== undefined) params.include_days = includeDays ? 1 : 0

  const { data } = await api.get(`/v1/admin/employees/${employeeId}/overtime`, { params })
  const payload = data?.data ?? data ?? {}

  const getMinutesFromSource = (source) => {
    if (source === null || source === undefined) return null
    if (typeof source === 'number') return Number.isFinite(source) ? source : null
    if (typeof source === 'string') {
      const parsed = Number(source)
      if (Number.isFinite(parsed)) return parsed
    }
    if (typeof source !== 'object') return null

    const candidates = [
      source.balanceMinutes,
      source.balance_minutes,
      source.totalMinutes,
      source.total_minutes,
      source.minutesBalance,
      source.minutes_balance,
      source.minutes,
    ]
    for (const value of candidates) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }

    const secondsCandidates = [
      source.balanceSeconds,
      source.balance_seconds,
      source.totalSeconds,
      source.total_seconds,
      source.seconds,
    ]
    for (const value of secondsCandidates) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed / 60
    }

    return null
  }

  const extractMinutes = (source) => {
    const direct = getMinutesFromSource(source)
    if (direct !== null) return direct
    if (source?.summary) {
      const summaryMinutes = getMinutesFromSource(source.summary)
      if (summaryMinutes !== null) return summaryMinutes
    }
    if (source?.balance) {
      const balanceMinutes = getMinutesFromSource(source.balance)
      if (balanceMinutes !== null) return balanceMinutes
    }
    if (source?.totals) {
      const totalsMinutes = getMinutesFromSource(source.totals)
      if (totalsMinutes !== null) return totalsMinutes
    }
    if (Array.isArray(source?.days)) {
      const total = source.days.reduce((acc, day) => acc + (getMinutesFromSource(day) ?? 0), 0)
      if (Number.isFinite(total)) return total
    }
    if (Array.isArray(source)) {
      const total = source.reduce((acc, item) => acc + (getMinutesFromSource(item) ?? 0), 0)
      if (Number.isFinite(total)) return total
    }
    return null
  }

  const balanceMinutes = extractMinutes(payload)

  return {
    ...(typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    balanceMinutes,
  }
}

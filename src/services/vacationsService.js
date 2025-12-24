import { api } from './http/api'

export const normalizeVacation = (vacation = {}, index = 0) => {
  const startDate = vacation.start_date ?? vacation.startDate ?? vacation.start ?? ''
  const endDate = vacation.end_date ?? vacation.endDate ?? vacation.end ?? ''
  const status = (vacation.status ?? vacation.state ?? '').toString()

  return {
    ...vacation,
    id: vacation.id ?? vacation.uuid ?? vacation.request_id ?? `vacation-${index}`,
    userId: vacation.user_id ?? vacation.userId ?? vacation.employee_id ?? vacation.employeeId,
    startDate,
    endDate,
    status: status ? status.toLowerCase() : status,
    requestedDays:
      vacation.requested_days ??
      vacation.requestedDays ??
      vacation.days_requested ??
      vacation.days ??
      null,
    notes: vacation.notes ?? vacation.note ?? vacation.comment ?? '',
    rejectionReason: vacation.rejection_reason ?? vacation.rejectionReason ?? vacation.reason ?? '',
    createdAt: vacation.created_at ?? vacation.createdAt ?? vacation.requested_at ?? '',
    user: vacation.user ?? vacation.employee ?? vacation.collaborator ?? null,
  }
}

const normalizeListResponse = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.vacations)
        ? payload.vacations
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

export async function listEmployeeVacations({ page = 1 } = {}) {
  const params = {}
  if (page) params.page = page

  const { data } = await api.get('/v1/employee/vacations', { params })
  const { items, meta } = normalizeListResponse(data, page)
  return { data: items.map(normalizeVacation), meta }
}

export async function requestEmployeeVacation(payload = {}) {
  const startDate = payload.start_date ?? payload.startDate ?? payload.start
  const endDate = payload.end_date ?? payload.endDate ?? payload.end
  const notes = payload.notes ?? payload.note ?? payload.comment

  const body = { start_date: startDate, end_date: endDate }
  if (notes) body.notes = notes

  const { data } = await api.post('/v1/employee/vacations', body)
  return data?.data ?? data
}

export async function getEmployeeVacationBalance() {
  const { data } = await api.get('/v1/employee/vacations/balance')
  return data?.data ?? data
}

export async function cancelEmployeeVacation(id) {
  const { data } = await api.delete(`/v1/employee/vacations/${id}`)
  return data?.data ?? data
}

export async function listAdminVacations({ status, userId, page } = {}) {
  const params = {}
  if (status) params.status = status
  if (userId) params.user_id = userId
  if (page) params.page = page

  const { data } = await api.get('/v1/admin/vacations', { params })
  const { items, meta } = normalizeListResponse(data, page || 1)
  return { data: items.map(normalizeVacation), meta }
}

export async function createAdminVacation(payload = {}) {
  const { data } = await api.post('/v1/admin/vacations', payload)
  return data?.data ?? data
}

export async function approveVacation(id, payload) {
  const body = payload && Object.keys(payload).length ? payload : undefined
  const { data } = body
    ? await api.post(`/v1/admin/vacations/${id}/approve`, body)
    : await api.post(`/v1/admin/vacations/${id}/approve`)
  return data?.data ?? data
}

export async function rejectVacation(id, rejectionReason) {
  const body = { rejection_reason: rejectionReason }
  const { data } = await api.post(`/v1/admin/vacations/${id}/reject`, body)
  return data?.data ?? data
}

export async function getAdminVacationBalance(userId) {
  const { data } = await api.get(`/v1/admin/vacations/balance/${userId}`)
  return data?.data ?? data
}

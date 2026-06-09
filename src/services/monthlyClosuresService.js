import { api } from './http/api'

const normalizeListResponse = (data, fallbackPage = 1) => {
  const items = Array.isArray(data?.data) ? data.data : []
  const meta = {
    currentPage: data?.meta?.current_page ?? fallbackPage,
    perPage: data?.meta?.per_page ?? 20,
    total: data?.meta?.total ?? items.length,
    lastPage: data?.meta?.last_page ?? 1,
  }
  return { items, meta }
}

export async function listMonthlyClosures({ page = 1, perPage = 20 } = {}) {
  const { data } = await api.get('/v1/admin/monthly-closures', {
    params: { page, per_page: perPage },
  })
  return normalizeListResponse(data, page)
}

export async function createMonthlyClosure({ referenceYear, referenceMonth, employeeId }) {
  const { data } = await api.post('/v1/admin/monthly-closures', {
    employee_id: employeeId,
    reference_year: referenceYear,
    reference_month: referenceMonth,
  })
  return data?.data ?? data
}

export async function getMonthlyClosure(closureId) {
  const { data } = await api.get(`/v1/admin/monthly-closures/${closureId}`)
  return data?.data ?? data
}

export async function listClosureTimesheets(
  closureId,
  { page = 1, perPage = 100, skipAccessDeniedHandling = false } = {},
) {
  const { data } = await api.get(`/v1/admin/monthly-closures/${closureId}/timesheets`, {
    params: { page, per_page: perPage },
    skipAccessDeniedHandling,
  })
  return normalizeListResponse(data, page)
}

export async function getAdminTimesheet(timesheetId) {
  const { data } = await api.get(`/v1/admin/timesheets/${timesheetId}`)
  return data?.data ?? data
}

export async function signTimesheetAsManager(timesheetId) {
  const { data } = await api.post(`/v1/admin/timesheets/${timesheetId}/sign`, {})
  return data?.data ?? data
}

export async function resolveTimesheetDispute(timesheetId, disputeId, resolutionNote) {
  const { data } = await api.post(
    `/v1/admin/timesheets/${timesheetId}/disputes/${disputeId}/resolve`,
    { resolution_note: resolutionNote },
  )
  return data?.data ?? data
}

export async function fetchAdminTimesheetPdf(timesheetId) {
  const response = await api.get(`/v1/admin/timesheets/${timesheetId}/pdf`, {
    responseType: 'blob',
  })
  const contentType = response.headers?.['content-type'] || ''
  if (contentType.includes('application/json')) {
    const text = await response.data.text()
    const { url } = JSON.parse(text)
    return { type: 'url', url }
  }
  return { type: 'blob', blob: response.data, response }
}

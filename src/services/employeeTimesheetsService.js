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

export async function listMyTimesheets({ page = 1, perPage = 20 } = {}) {
  const { data } = await api.get('/v1/employee/timesheets', {
    params: { page, per_page: perPage },
  })
  return normalizeListResponse(data, page)
}

export async function getMyTimesheet(timesheetId) {
  const { data } = await api.get(`/v1/employee/timesheets/${timesheetId}`)
  return data?.data ?? data
}

export async function signMyTimesheet(timesheetId, { signatureImage, acceptedTerms, password }) {
  const { data } = await api.post(`/v1/employee/timesheets/${timesheetId}/sign`, {
    signature_image: signatureImage,
    accepted_terms: acceptedTerms,
    password,
  })
  return data?.data ?? data
}

export async function disputeMyTimesheet(timesheetId, reason) {
  const { data } = await api.post(`/v1/employee/timesheets/${timesheetId}/dispute`, { reason })
  return data?.data ?? data
}

export async function fetchMyTimesheetPdf(timesheetId) {
  const response = await api.get(`/v1/employee/timesheets/${timesheetId}/pdf`, {
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

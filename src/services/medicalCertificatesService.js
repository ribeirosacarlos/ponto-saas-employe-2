import { api } from './http/api'

export const normalizeMedicalCertificate = (certificate = {}, index = 0) => {
  const coverageType = (
    certificate.coverage_type ??
    certificate.coverageType ??
    certificate.coverage ??
    ''
  )
    .toString()
    .toLowerCase()
  const status = (certificate.status ?? certificate.state ?? '').toString().toLowerCase()

  return {
    ...certificate,
    id: certificate.id ?? certificate.uuid ?? `medical-certificate-${index}`,
    userId: certificate.user_id ?? certificate.userId ?? certificate.employee_id ?? certificate.employeeId,
    type: certificate.type ?? 'sick_leave',
    coverageType,
    startDate: certificate.start_date ?? certificate.startDate ?? certificate.date ?? '',
    endDate: certificate.end_date ?? certificate.endDate ?? certificate.date ?? '',
    date: certificate.date ?? certificate.start_date ?? certificate.startDate ?? '',
    startTime: certificate.start_time ?? certificate.startTime ?? '',
    endTime: certificate.end_time ?? certificate.endTime ?? '',
    status,
    comment: certificate.comment ?? certificate.notes ?? certificate.description ?? '',
    rejectionReason:
      certificate.rejection_reason ?? certificate.rejectionReason ?? certificate.reason ?? '',
    documents: Array.isArray(certificate.documents) ? certificate.documents : [],
    createdAt: certificate.created_at ?? certificate.createdAt ?? '',
    updatedAt: certificate.updated_at ?? certificate.updatedAt ?? '',
  }
}

const normalizeListResponse = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.medical_certificates)
        ? payload.medical_certificates
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

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null || value === '') return
  formData.append(key, value)
}

const ensureMedicalCertificateFormData = (payload = {}) => {
  if (payload instanceof FormData) return payload

  const formData = new FormData()
  appendIfPresent(formData, 'coverage_type', payload.coverage_type ?? payload.coverageType)
  appendIfPresent(formData, 'start_date', payload.start_date ?? payload.startDate)
  appendIfPresent(formData, 'end_date', payload.end_date ?? payload.endDate)
  appendIfPresent(formData, 'date', payload.date)
  appendIfPresent(formData, 'start_time', payload.start_time ?? payload.startTime)
  appendIfPresent(formData, 'end_time', payload.end_time ?? payload.endTime)
  appendIfPresent(formData, 'comment', payload.comment ?? payload.notes)

  const files = Array.isArray(payload.files)
    ? payload.files
    : payload.file
      ? [payload.file]
      : []

  files.filter(Boolean).forEach((file) => formData.append('files[]', file))
  return formData
}

export async function listEmployeeMedicalCertificates({
  status,
  from,
  to,
  page = 1,
  perPage = 20,
} = {}) {
  const params = {}
  if (status && status !== 'all') params.status = status
  if (from) params.from = from
  if (to) params.to = to
  if (page) params.page = page
  if (perPage) params.per_page = perPage

  const { data } = await api.get('/v1/employee/medical-certificates', { params })
  const { items, meta } = normalizeListResponse(data, page)
  return { data: items.map(normalizeMedicalCertificate), meta }
}

export async function listAdminMedicalCertificates({
  userId,
  status,
  from,
  to,
  page = 1,
  perPage = 20,
} = {}) {
  const params = {}
  if (userId) params.user_id = userId
  if (status && status !== 'all') params.status = status
  if (from) params.from = from
  if (to) params.to = to
  if (page) params.page = page
  if (perPage) params.per_page = perPage

  const { data } = await api.get('/v1/admin/medical-certificates', { params })
  const { items, meta } = normalizeListResponse(data, page)
  return { data: items.map(normalizeMedicalCertificate), meta }
}

export async function createEmployeeMedicalCertificate(payload = {}) {
  const body = ensureMedicalCertificateFormData(payload)
  const { data } = await api.post('/v1/employee/medical-certificates', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalizeMedicalCertificate(data?.data ?? data ?? {}, 0)
}

export async function createAdminMedicalCertificate(payload = {}) {
  const body = ensureMedicalCertificateFormData(payload)
  appendIfPresent(body, 'user_id', payload.user_id ?? payload.userId)

  const { data } = await api.post('/v1/admin/medical-certificates', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalizeMedicalCertificate(data?.data ?? data ?? {}, 0)
}

export async function approveAdminMedicalCertificate(id) {
  const { data } = await api.patch(`/v1/admin/medical-certificates/${id}/approve`)
  return normalizeMedicalCertificate(data?.data ?? data ?? {}, 0)
}

export async function rejectAdminMedicalCertificate(id, rejectionReason) {
  const body = rejectionReason ? { rejection_reason: rejectionReason } : undefined
  const { data } = body
    ? await api.patch(`/v1/admin/medical-certificates/${id}/reject`, body)
    : await api.patch(`/v1/admin/medical-certificates/${id}/reject`)
  return normalizeMedicalCertificate(data?.data ?? data ?? {}, 0)
}

export async function cancelEmployeeMedicalCertificate(id) {
  const { data } = await api.delete(`/v1/employee/medical-certificates/${id}`)
  return normalizeMedicalCertificate(data?.data ?? data ?? {}, 0)
}

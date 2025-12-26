import { api } from './http/api'

const normalizeListResponse = (data) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.companies)
        ? payload.companies
        : Array.isArray(payload?.items)
          ? payload.items
          : []
  const meta = data?.meta || payload?.meta || null

  return { items, meta }
}

const normalizeCompanyStatus = (company = {}) => {
  const statusRaw = String(company.status ?? company.state ?? company.company_status ?? '').toLowerCase()
  const deletedAt =
    company.deleted_at ??
    company.deletedAt ??
    company.removed_at ??
    company.removedAt ??
    company.archived_at ??
    ''
  const blockedAt =
    company.blocked_at ??
    company.blockedAt ??
    company.suspended_at ??
    company.suspendedAt ??
    ''

  const isDeleted = Boolean(
    company.deleted ||
      company.is_deleted ||
      company.isDeleted ||
      deletedAt ||
      ['deleted', 'removed', 'archived', 'inactive', 'deactivated'].includes(statusRaw),
  )

  const isBlocked = Boolean(
    company.blocked ||
      company.is_blocked ||
      company.isBlocked ||
      blockedAt ||
      ['blocked', 'suspended', 'disabled'].includes(statusRaw),
  )

  const activeFlag = company.active ?? company.is_active ?? company.isActive
  const isActive = !isDeleted && !isBlocked && (activeFlag === undefined ? true : Boolean(activeFlag))
  const status = isDeleted ? 'deleted' : isBlocked ? 'blocked' : 'active'

  return { status, isDeleted, isBlocked, isActive, deletedAt, blockedAt }
}

export const normalizeCompany = (company = {}, index = 0) => {
  const payload = company || {}
  const id =
    payload?.id ??
    payload?.uuid ??
    payload?.company_id ??
    payload?.companyId ??
    payload?.slug ??
    payload?.code ??
    `company-${index}`
  const name =
    payload?.name ??
    payload?.company_name ??
    payload?.companyName ??
    payload?.title ??
    payload?.legal_name ??
    payload?.legalName ??
    ''
  const domain =
    payload?.domain ??
    payload?.company_domain ??
    payload?.companyDomain ??
    payload?.slug ??
    payload?.subdomain ??
    payload?.website ??
    ''
  const createdAt =
    payload?.created_at ??
    payload?.createdAt ??
    payload?.created ??
    payload?.inserted_at ??
    ''
  const updatedAt = payload?.updated_at ?? payload?.updatedAt ?? payload?.updated ?? ''
  const { status, isDeleted, isBlocked, isActive, deletedAt, blockedAt } =
    normalizeCompanyStatus(payload)

  return {
    ...payload,
    id,
    name,
    domain,
    createdAt,
    updatedAt,
    deletedAt,
    blockedAt,
    status,
    isDeleted,
    isBlocked,
    isActive,
    raw: payload,
  }
}

export async function listCompanies() {
  const { data } = await api.get('/v1/platform/companies')
  const { items, meta } = normalizeListResponse(data)
  return { data: items.map(normalizeCompany), meta }
}

export async function getCompany(id) {
  if (!id) return null
  const { data } = await api.get(`/v1/platform/companies/${id}`)
  const payload = data?.data ?? data
  return normalizeCompany(payload)
}

export async function createCompany(payload = {}) {
  const { data } = await api.post('/v1/platform/companies', payload)
  return data?.data ?? data
}

export async function registerCompany(payload = {}) {
  const { data } = await api.post('/v1/platform/companies/register', payload)
  return data?.data ?? data
}

export async function updateCompany(id, payload = {}) {
  const { data } = await api.put(`/v1/platform/companies/${id}`, payload)
  return data?.data ?? data
}

export async function deleteCompany(id) {
  const { data } = await api.delete(`/v1/platform/companies/${id}`)
  return data?.data ?? data
}

export async function restoreCompany(id) {
  const { data } = await api.post(`/v1/platform/companies/${id}/restore`)
  return data?.data ?? data
}

export async function blockCompany(id) {
  const { data } = await api.post(`/v1/platform/companies/${id}/block`)
  return data?.data ?? data
}

export async function unblockCompany(id) {
  const { data } = await api.post(`/v1/platform/companies/${id}/unblock`)
  return data?.data ?? data
}

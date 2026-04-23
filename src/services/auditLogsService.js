import { api } from './http/api'

const SCOPE_BASE_PATHS = {
  admin: '/v1/admin/audit-logs',
  platform: '/v1/platform/audit-logs',
}

const compactParams = (params = {}) =>
  Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') return acc
    acc[key] = value
    return acc
  }, {})

const normalizeActor = (value = {}) => ({
  ...value,
  id: value?.id ?? null,
  name: value?.name ?? '',
  email: value?.email ?? '',
})

const normalizeCompany = (value = {}) => ({
  ...value,
  id: value?.id ?? null,
  name: value?.name ?? '',
  slug: value?.slug ?? '',
})

export const normalizeAuditLog = (item = {}, index = 0) => ({
  ...item,
  id: item?.id ?? `audit-log-${index}`,
  action: item?.action ?? '',
  description: item?.description ?? '',
  entityType: item?.entity_type ?? item?.entityType ?? '',
  entityLabel: item?.entity_label ?? item?.entityLabel ?? '',
  entityId: item?.entity_id ?? item?.entityId ?? null,
  companyId: item?.company_id ?? item?.companyId ?? null,
  targetCompanyId: item?.target_company_id ?? item?.targetCompanyId ?? null,
  performedByRole: item?.performed_by_role ?? item?.performedByRole ?? '',
  method: item?.method ?? '',
  route: item?.route ?? '',
  ipAddress: item?.ip_address ?? item?.ipAddress ?? '',
  userAgent: item?.user_agent ?? item?.userAgent ?? '',
  oldValues: item?.old_values ?? item?.oldValues ?? null,
  newValues: item?.new_values ?? item?.newValues ?? null,
  metadata: item?.metadata ?? null,
  createdAt: item?.created_at ?? item?.createdAt ?? '',
  actor: normalizeActor(item?.actor ?? {}),
  company: item?.company ? normalizeCompany(item.company) : null,
  targetCompany: item?.target_company ? normalizeCompany(item.target_company) : null,
})

const normalizePaginated = (payload = {}, page = 1, perPage = 20) => {
  const items = Array.isArray(payload?.data) ? payload.data : []
  const metaSource = payload?.meta ?? payload ?? {}
  const links = payload?.links ?? {}

  return {
    data: items.map((item, index) => normalizeAuditLog(item, index)),
    links,
    meta: {
      currentPage: metaSource?.current_page ?? metaSource?.currentPage ?? page,
      lastPage: metaSource?.last_page ?? metaSource?.lastPage ?? 1,
      perPage: metaSource?.per_page ?? metaSource?.perPage ?? perPage,
      total: metaSource?.total ?? items.length,
      from: metaSource?.from ?? null,
      to: metaSource?.to ?? null,
    },
  }
}

const resolveBasePath = (scope = 'admin') => SCOPE_BASE_PATHS[scope] || SCOPE_BASE_PATHS.admin

export async function listAuditLogs(scope = 'admin', params = {}, requestConfig = {}) {
  const page = params?.page ?? 1
  const perPage = params?.per_page ?? params?.perPage ?? 20
  const { data } = await api.get(resolveBasePath(scope), {
    ...requestConfig,
    params: compactParams({
      ...params,
      per_page: perPage,
      page,
    }),
  })

  return normalizePaginated(data, page, perPage)
}

export async function getAuditLog(scope = 'admin', id) {
  if (!id) return null
  const { data } = await api.get(`${resolveBasePath(scope)}/${id}`)
  return normalizeAuditLog(data?.data ?? data ?? {}, 0)
}

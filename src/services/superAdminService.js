import { api } from './http/api'
import { cleanQueryParams } from '../features/superAdmin/utils'

const BASE_PATH = '/v1/platform/super-admin'

const normalizePaginationMeta = (meta = {}) => ({
  currentPage: meta.current_page ?? meta.currentPage ?? 1,
  from: meta.from ?? null,
  lastPage: meta.last_page ?? meta.lastPage ?? 1,
  path: meta.path ?? '',
  perPage: meta.per_page ?? meta.perPage ?? 20,
  to: meta.to ?? null,
  total: meta.total ?? 0,
})

export const normalizeSuperAdminDashboard = (payload = {}) => {
  const data = payload?.data ?? payload

  return {
    generatedAt: data?.generated_at ?? data?.generatedAt ?? null,
    companies: {
      total: data?.companies?.total ?? 0,
      blocked: data?.companies?.blocked ?? 0,
      newLast30Days: data?.companies?.new_last_30_days ?? 0,
      activeLast7Days: data?.companies?.active_last_7_days ?? 0,
      activeLast30Days: data?.companies?.active_last_30_days ?? 0,
      trialing: data?.companies?.trialing ?? 0,
      paying: data?.companies?.paying ?? 0,
      pastDue: data?.companies?.past_due ?? 0,
      expiringIn7Days: data?.companies?.expiring_in_7_days ?? 0,
      atRisk: data?.companies?.at_risk ?? 0,
    },
    employees: {
      total:
        data?.billable_users?.total ??
        data?.employees?.total ??
        0,
      activeLast30Days:
        data?.billable_users?.active_last_30_days ??
        data?.employees?.active_last_30_days ??
        0,
    },
    timeEntries: {
      today: data?.time_entries?.today ?? 0,
      last7Days: data?.time_entries?.last_7_days ?? 0,
      last30Days: data?.time_entries?.last_30_days ?? 0,
    },
    revenue: {
      estimatedMrrCents: data?.revenue?.estimated_mrr_cents ?? 0,
      estimatedMrr: data?.revenue?.estimated_mrr ?? 0,
      averageTicketCents: data?.revenue?.average_ticket_cents ?? 0,
      averageTicket: data?.revenue?.average_ticket ?? 0,
      currency: data?.revenue?.currency ?? 'EUR',
    },
    raw: data,
  }
}

export const normalizeSuperAdminCompany = (company = {}, index = 0) => ({
  ...company,
  id: company?.id ?? `super-admin-company-${index}`,
  name: company?.name ?? '',
  slug: company?.slug ?? '',
  email: company?.email ?? '',
  document: company?.document ?? '',
  city: company?.city ?? '',
  state: company?.state ?? '',
  timezone: company?.timezone ?? '',
  isBlocked: Boolean(company?.is_blocked ?? company?.isBlocked),
  blockedAt: company?.blocked_at ?? company?.blockedAt ?? null,
  subscriptionStatus: company?.subscription_status ?? company?.subscriptionStatus ?? '',
  subscriptionStatusLabel:
    company?.subscription_status_label ?? company?.subscriptionStatusLabel ?? '',
  planName: company?.plan_name ?? company?.planName ?? '',
  planSlug: company?.plan_slug ?? company?.planSlug ?? '',
  planPriceCents: company?.plan_price_cents ?? company?.planPriceCents ?? null,
  employeesCount:
    company?.billable_users_count ??
    company?.billableUsersCount ??
    company?.employees_count ??
    company?.employeesCount ??
    0,
  activeEmployees30d:
    company?.active_billable_users_30d ??
    company?.activeBillableUsers30d ??
    company?.active_employees_30d ??
    company?.activeEmployees30d ??
    0,
  timeEntriesToday: company?.time_entries_today ?? company?.timeEntriesToday ?? 0,
  timeEntries30d: company?.time_entries_30d ?? company?.timeEntries30d ?? 0,
  lastActivityAt: company?.last_activity_at ?? company?.lastActivityAt ?? null,
  healthStatus: company?.health_status ?? company?.healthStatus ?? '',
  createdAt: company?.created_at ?? company?.createdAt ?? null,
  updatedAt: company?.updated_at ?? company?.updatedAt ?? null,
  raw: company,
})

export async function getSuperAdminDashboard() {
  const { data } = await api.get(`${BASE_PATH}/dashboard`)
  return normalizeSuperAdminDashboard(data)
}

export async function listSuperAdminCompanies(params = {}) {
  const { data } = await api.get(`${BASE_PATH}/companies`, {
    params: cleanQueryParams({
      search: params.search,
      status: params.status,
      activity: params.activity,
      sort: params.sort,
      per_page: params.per_page,
      page: params.page,
    }),
  })

  return {
    data: Array.isArray(data?.data) ? data.data.map(normalizeSuperAdminCompany) : [],
    links: data?.links ?? {},
    meta: normalizePaginationMeta(data?.meta ?? {}),
  }
}

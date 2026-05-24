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

const normalizeSeriesPoint = (point, index = 0) => {
  if (!point) return null
  if (Array.isArray(point)) {
    return {
      id: `series-point-${index}`,
      date: point[0] ?? '',
      value: Number(point[1] ?? 0),
    }
  }

  return {
    id: point?.id ?? `series-point-${index}`,
    date: point?.date ?? point?.day ?? point?.label ?? '',
    value: Number(point?.value ?? point?.count ?? point?.total ?? point?.entries ?? point?.companies ?? 0),
  }
}

const normalizeSeriesWindowMap = (payload = {}) =>
  ['30d', '60d', '90d'].reduce((acc, key) => {
    const rawSeries = payload?.[key] ?? payload?.[key.replace('d', '_days')] ?? []
    acc[key] = Array.isArray(rawSeries) ? rawSeries.map(normalizeSeriesPoint).filter(Boolean) : []
    return acc
  }, {})

const normalizeBreakdownItems = (payload, valueKeys = ['count', 'value', 'total']) => {
  if (Array.isArray(payload)) {
    return payload.map((item, index) => ({
      id: item?.id ?? item?.key ?? item?.slug ?? item?.status ?? item?.name ?? `breakdown-${index}`,
      key: item?.key ?? item?.slug ?? item?.status ?? item?.name ?? `breakdown-${index}`,
      label: item?.label ?? item?.name ?? item?.status_label ?? item?.statusLabel ?? item?.slug ?? item?.status ?? '--',
      value: Number(
        valueKeys.reduce(
          (resolved, currentKey) => (resolved !== undefined ? resolved : item?.[currentKey]),
          undefined,
        ) ?? 0,
      ),
      raw: item,
    }))
  }

  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value], index) => ({
      id: `breakdown-${index}-${key}`,
      key,
      label: key,
      value: Number(value ?? 0),
      raw: value,
    }))
  }

  return []
}

const normalizeRecentEvent = (event = {}, index = 0) => ({
  id: event?.id ?? `recent-event-${index}`,
  type: event?.type ?? event?.event_type ?? event?.eventType ?? 'event',
  title: event?.title ?? event?.label ?? event?.message ?? event?.description ?? '',
  description: event?.description ?? event?.details ?? event?.message ?? '',
  occurredAt: event?.occurred_at ?? event?.occurredAt ?? event?.created_at ?? event?.createdAt ?? null,
  companyName: event?.company_name ?? event?.companyName ?? event?.company?.name ?? '',
  companyId: event?.company_id ?? event?.companyId ?? event?.company?.id ?? null,
  severity: event?.severity ?? event?.level ?? '',
  raw: event,
})

const normalizeActivityCompany = (company = {}, index = 0) => ({
  id: company?.id ?? `activity-company-${index}`,
  name: company?.name ?? company?.company_name ?? 'Empresa',
  slug: company?.slug ?? '',
  timeEntries30d: Number(company?.time_entries_30d ?? company?.timeEntries30d ?? 0),
  activeBillableUsers30d: Number(
    company?.active_billable_users_30d ?? company?.activeBillableUsers30d ?? company?.active_employees_30d ?? 0,
  ),
  raw: company,
})

const normalizeRiskCompany = (company = {}, index = 0) => ({
  id: company?.id ?? `risk-company-${index}`,
  name: company?.name ?? company?.company_name ?? 'Empresa',
  slug: company?.slug ?? '',
  riskScore: Number(company?.risk_score ?? company?.riskScore ?? 0),
  blocked: Boolean(company?.blocked ?? company?.is_blocked ?? company?.isBlocked ?? false),
  pastDue: Boolean(company?.past_due ?? company?.pastDue ?? false),
  inactiveDays: Number(company?.inactive_days ?? company?.inactiveDays ?? 0),
  healthStatus: company?.health_status ?? company?.healthStatus ?? '',
  raw: company,
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
    timeEntriesSeries: normalizeSeriesWindowMap(data?.time_entries_series ?? data?.timeEntriesSeries),
    activeCompaniesSeries: normalizeSeriesWindowMap(data?.active_companies_series ?? data?.activeCompaniesSeries),
    subscriptionStatusBreakdown: normalizeBreakdownItems(
      data?.subscription_status_breakdown ?? data?.subscriptionStatusBreakdown,
    ),
    planBreakdown: normalizeBreakdownItems(data?.plan_breakdown ?? data?.planBreakdown),
    recentEvents: Array.isArray(data?.recent_events ?? data?.recentEvents)
      ? (data?.recent_events ?? data?.recentEvents).map(normalizeRecentEvent)
      : [],
    topCompaniesByActivity: Array.isArray(data?.top_companies_by_activity ?? data?.topCompaniesByActivity)
      ? (data?.top_companies_by_activity ?? data?.topCompaniesByActivity).map(normalizeActivityCompany)
      : [],
    topCompaniesByRisk: Array.isArray(data?.top_companies_by_risk ?? data?.topCompaniesByRisk)
      ? (data?.top_companies_by_risk ?? data?.topCompaniesByRisk).map(normalizeRiskCompany)
      : [],
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

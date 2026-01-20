import { api } from './http/api'

const normalizeListResponse = (data) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : []
  const meta = data?.meta || payload?.meta || null

  return { items, meta }
}

export const normalizePlan = (plan = {}, index = 0) => {
  const payload = plan || {}
  const id = payload.id || payload.plan_id || `plan-${index}`
  const priceCents = payload.price_cents ?? payload.priceCents ?? null
  const billingInterval = payload.billing_interval ?? payload.billingInterval ?? ''

  return {
    ...payload,
    id,
    name: payload.name || '',
    slug: payload.slug || '',
    description: payload.description || '',
    priceCents,
    currency: payload.currency || 'BRL',
    billingInterval,
    trialDays: payload.trial_days ?? payload.trialDays ?? null,
    isActive: payload.is_active ?? payload.isActive ?? false,
    sortOrder: payload.sort_order ?? payload.sortOrder ?? null,
    features: payload.features || {},
    quotas: payload.quotas || {},
    raw: payload,
  }
}

export const normalizeSubscription = (subscription = {}) => {
  const payload = subscription || {}
  const plan = payload.plan ? normalizePlan(payload.plan) : null

  return {
    ...payload,
    id: payload.id || payload.subscription_id || '',
    companyId: payload.company_id || payload.companyId || '',
    plan,
    status: payload.status || '',
    trialEndsAt: payload.trial_ends_at ?? payload.trialEndsAt ?? '',
    currentPeriodStart: payload.current_period_start ?? payload.currentPeriodStart ?? '',
    currentPeriodEnd: payload.current_period_end ?? payload.currentPeriodEnd ?? '',
    canceledAt: payload.canceled_at ?? payload.canceledAt ?? '',
    pastDueSince: payload.past_due_since ?? payload.pastDueSince ?? '',
    gracePeriodDays: payload.grace_period_days ?? payload.gracePeriodDays ?? null,
    stripeCustomerId: payload.stripe_customer_id ?? payload.stripeCustomerId ?? '',
    stripeSubscriptionId: payload.stripe_subscription_id ?? payload.stripeSubscriptionId ?? '',
    metadata: payload.metadata || {},
    raw: payload,
  }
}

export async function listBillingPlans() {
  const { data } = await api.get('/v1/platform/billing/plans')
  const { items, meta } = normalizeListResponse(data)
  return { data: items.map(normalizePlan), meta }
}

export async function createBillingPlan(payload = {}) {
  const { data } = await api.post('/v1/platform/billing/plans', payload)
  const payloadData = data?.data ?? data
  return normalizePlan(payloadData)
}

export async function updateBillingPlan(planId, payload = {}) {
  if (!planId) return null
  const { data } = await api.patch(`/v1/platform/billing/plans/${planId}`, payload)
  const payloadData = data?.data ?? data
  return normalizePlan(payloadData)
}

export async function getCompanySubscription(companyId) {
  if (!companyId) return null
  const { data } = await api.get(`/v1/platform/billing/companies/${companyId}/subscription`)
  const payload = data?.data ?? data
  return normalizeSubscription(payload)
}

export async function updateCompanySubscription(companyId, payload = {}) {
  if (!companyId) return null
  const { data } = await api.patch(
    `/v1/platform/billing/companies/${companyId}/subscription`,
    payload,
  )
  const payloadData = data?.data ?? data
  return normalizeSubscription(payloadData)
}

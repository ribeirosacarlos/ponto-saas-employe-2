import { api } from './http/api'
import { normalizePlan, normalizeSubscription } from './platformBillingService'

const PUBLIC_ENDPOINT = '/v1/public/plans'
const AUTH_ENDPOINT = '/v1/billing/plans'
const FALLBACK_ENDPOINT = '/v1/platform/billing/plans'
const CHECKOUT_ENDPOINT = '/v1/billing/checkout-session'
const COMPANY_SUBSCRIPTION_ENDPOINT = '/v1/platform/billing/companies'

export async function listActivePlans() {
  const endpoints = [PUBLIC_ENDPOINT, AUTH_ENDPOINT, FALLBACK_ENDPOINT]
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint)
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      return items.map((plan, index) => normalizePlan(plan, index))
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export function normalizePlanInterval(plan) {
  return plan?.billingInterval || plan?.billing_interval || 'month'
}

export async function createCheckoutSession({ planId, planSlug, interval }) {
  const payload = {}
  if (planId) payload.plan_id = planId
  if (planSlug) payload.plan_slug = planSlug
  if (interval) payload.billing_interval = interval

  const { data } = await api.post(CHECKOUT_ENDPOINT, payload)
  const url =
    data?.checkout_url ||
    data?.url ||
    data?.data?.checkout_url ||
    data?.data?.url
  if (!url) {
    const message = data?.message || 'Checkout indisponivel no momento.'
    const error = new Error(message)
    error.response = { data }
    throw error
  }
  return url
}

export async function getCurrentCompanySubscription(companyId) {
  if (!companyId) throw new Error('Company id is required')
  const { data } = await api.get(`${COMPANY_SUBSCRIPTION_ENDPOINT}/${companyId}/subscription`)
  const payload = data?.data ?? data
  return normalizeSubscription(payload)
}

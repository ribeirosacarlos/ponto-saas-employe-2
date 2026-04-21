import { api } from '../http/api'

const SUBSCRIPTION_ENDPOINT = '/v1/settings/subscription'
const CANCEL_SUBSCRIPTION_ENDPOINT = '/v1/settings/subscription/cancel'

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

export function normalizeSettingsSubscription(subscription) {
  if (!subscription) return null

  const payload = subscription || {}

  return {
    ...payload,
    status: payload.status ?? null,
    cancel_at_period_end: payload.cancel_at_period_end ?? payload.cancelAtPeriodEnd ?? false,
    current_period_end: parseDate(payload.current_period_end ?? payload.currentPeriodEnd),
    access_expires_at: parseDate(payload.access_expires_at ?? payload.accessExpiresAt),
    is_plan_active: payload.is_plan_active ?? payload.isPlanActive ?? false,
  }
}

export async function getSettingsSubscription() {
  const { data } = await api.get(SUBSCRIPTION_ENDPOINT)
  const payload = data?.data ?? data ?? {}
  return normalizeSettingsSubscription(payload)
}

export async function cancelSettingsSubscription() {
  const { data } = await api.post(CANCEL_SUBSCRIPTION_ENDPOINT)
  const payload = data?.data ?? data ?? null
  return normalizeSettingsSubscription(payload)
}

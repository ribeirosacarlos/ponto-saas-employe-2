import { api } from '../http/api'

/**
 * @typedef {Object} SettingsBillingPlan
 * @property {string | null} [name]
 * @property {string | null} [slug]
 * @property {number | null} [price_cents]
 * @property {string | null} [currency]
 * @property {"month" | "year" | "one_time" | string | null} [billing_interval]
 * @property {Record<string, number> | null} [limits]
 */

/**
 * @typedef {Object} SettingsBillingSubscription
 * @property {string | null} [status]
 * @property {string | null} [status_label]
 * @property {string | null} [next_action]
 * @property {string | null} [stripe_customer_id]
 * @property {string | null} [stripe_subscription_id]
 * @property {string | null} [subscription_status]
 * @property {string | null} [trial_ends_at]
 * @property {number | null} [trial_days_remaining]
 * @property {string | null} [current_period_end]
 * @property {number | null} [billing_days_remaining]
 * @property {string | null} [subscription_ends_at]
 * @property {boolean | null} [cancel_at_period_end]
 * @property {string | null} [canceled_at]
 */

/**
 * @typedef {Object} SettingsBilling
 * @property {SettingsBillingPlan | null} [plan]
 * @property {SettingsBillingSubscription | null} [subscription]
 */

/**
 * @typedef {Object} SettingsFlags
 * @property {boolean} [can_access_system]
 * @property {boolean} [is_trial]
 * @property {boolean} [is_trial_active]
 * @property {boolean} [is_subscription_active]
 * @property {boolean} [requires_action]
 */

/**
 * @typedef {Object} SettingsLinks
 * @property {string | null} [checkout_url]
 * @property {string | null} [customer_portal_url]
 */

/**
 * @typedef {Object} SettingsCompany
 * @property {string} [name]
 * @property {string | null} [timezone]
 * @property {string | null} [country]
 * @property {string | null} [locale]
 * @property {string | null} [created_at]
 */

/**
 * @typedef {Object} SettingsWorkdayShiftDay
 * @property {number} [weekday]
 * @property {boolean} [is_working_day]
 * @property {string | null} [start_time]
 * @property {string | null} [end_time]
 * @property {boolean} [break_expected]
 */

/**
 * @typedef {Object} SettingsWorkdayDefaultShift
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [start_time]
 * @property {string} [end_time]
 * @property {SettingsWorkdayShiftDay[]} [days]
 */

/**
 * @typedef {Object} SettingsWorkday
 * @property {SettingsWorkdayDefaultShift | null} [default_shift]
 * @property {number} [tolerance_minutes]
 * @property {number | null} [rounding_minutes]
 * @property {boolean} [geolocation_enabled]
 * @property {boolean | null} [require_photo]
 */

/**
 * @typedef {Object} SettingsSecurity
 * @property {boolean | null} [two_factor_enabled]
 * @property {string | null} [last_login_at]
 */

/**
 * @typedef {Object} SettingsUsageEmployees
 * @property {number} [current]
 * @property {number | null} [limit]
 * @property {boolean} [over_limit]
 */

/**
 * @typedef {Object} SettingsUsage
 * @property {SettingsUsageEmployees} [employees]
 */

/**
 * @typedef {Object} SettingsCompliance
 * @property {number | null} [log_retention_days]
 * @property {boolean} [export_enabled]
 */

/**
 * @typedef {Object} SettingsOverviewResponse
 * @property {SettingsBilling | null} [billing]
 * @property {SettingsFlags | null} [flags]
 * @property {SettingsLinks | null} [links]
 * @property {SettingsCompany | null} [company]
 * @property {SettingsWorkday | null} [workday]
 * @property {SettingsSecurity | null} [security]
 * @property {SettingsUsage | null} [usage]
 * @property {SettingsCompliance | null} [compliance]
 */

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

const normalizePlan = (plan) => {
  if (!plan) return null
  const payload = plan || {}
  return {
    ...payload,
    price_cents: payload.price_cents ?? payload.priceCents ?? null,
    currency: payload.currency ?? null,
    billing_interval: payload.billing_interval ?? payload.billingInterval ?? null,
    limits: payload.limits ?? payload.quotas ?? null,
  }
}

const normalizeSubscription = (subscription) => {
  if (!subscription) return null
  const payload = subscription || {}
  return {
    ...payload,
    status: payload.status ?? null,
    status_label: payload.status_label ?? payload.statusLabel ?? null,
    next_action: payload.next_action ?? payload.nextAction ?? null,
    stripe_customer_id: payload.stripe_customer_id ?? payload.stripeCustomerId ?? null,
    stripe_subscription_id:
      payload.stripe_subscription_id ?? payload.stripeSubscriptionId ?? null,
    subscription_status: payload.subscription_status ?? payload.subscriptionStatus ?? null,
    trial_ends_at: parseDate(payload.trial_ends_at ?? payload.trialEndsAt),
    trial_days_remaining: payload.trial_days_remaining ?? payload.trialDaysRemaining ?? null,
    current_period_end: parseDate(payload.current_period_end ?? payload.currentPeriodEnd),
    billing_days_remaining:
      payload.billing_days_remaining ?? payload.billingDaysRemaining ?? null,
    subscription_ends_at: parseDate(payload.subscription_ends_at ?? payload.subscriptionEndsAt),
    cancel_at_period_end:
      payload.cancel_at_period_end ?? payload.cancelAtPeriodEnd ?? null,
    canceled_at: parseDate(payload.canceled_at ?? payload.canceledAt),
  }
}

const normalizeBilling = (billing) => {
  if (!billing) return null
  const payload = billing || {}
  return {
    ...payload,
    plan: normalizePlan(payload.plan),
    subscription: normalizeSubscription(payload.subscription),
  }
}

const normalizeCompany = (company) => {
  if (!company) return null
  const payload = company || {}
  return {
    ...payload,
    created_at: parseDate(payload.created_at ?? payload.createdAt),
  }
}

const normalizeWorkday = (workday) => {
  if (!workday) return null
  const payload = workday || {}
  return {
    ...payload,
    default_shift: payload.default_shift ?? payload.defaultShift ?? null,
    rounding_minutes: payload.rounding_minutes ?? payload.roundingMinutes ?? null,
    tolerance_minutes: payload.tolerance_minutes ?? payload.toleranceMinutes ?? null,
    geolocation_enabled: payload.geolocation_enabled ?? payload.geolocationEnabled ?? null,
    require_photo: payload.require_photo ?? payload.requirePhoto ?? null,
  }
}

const normalizeUsage = (usage) => {
  if (!usage) return null
  const payload = usage || {}
  const employees = payload.employees || {}
  return {
    ...payload,
    employees: {
      current: employees.current ?? 0,
      limit: employees.limit ?? null,
      over_limit: employees.over_limit ?? employees.overLimit ?? false,
    },
  }
}

const normalizeSecurity = (security) => {
  if (!security) return null
  const payload = security || {}
  return {
    ...payload,
    two_factor_enabled: payload.two_factor_enabled ?? payload.twoFactorEnabled ?? null,
    last_login_at: parseDate(payload.last_login_at ?? payload.lastLoginAt),
  }
}

const normalizeCompliance = (compliance) => {
  if (!compliance) return null
  const payload = compliance || {}
  return {
    ...payload,
    log_retention_days: payload.log_retention_days ?? payload.logRetentionDays ?? null,
    export_enabled: payload.export_enabled ?? payload.exportEnabled ?? null,
  }
}

/**
 * Busca o overview de configurações/billing usando o endpoint documentado.
 * @returns {Promise<SettingsOverviewResponse>}
 */
export async function getSettingsOverview() {
  const { data } = await api.get('/v1/settings/overview')
  const payload = data?.data ?? data ?? {}

  return {
    billing: normalizeBilling(payload.billing),
    flags: payload.flags ?? null,
    links: payload.links ?? null,
    company: normalizeCompany(payload.company),
    workday: normalizeWorkday(payload.workday),
    security: normalizeSecurity(payload.security),
    usage: normalizeUsage(payload.usage),
    compliance: normalizeCompliance(payload.compliance),
  }
}

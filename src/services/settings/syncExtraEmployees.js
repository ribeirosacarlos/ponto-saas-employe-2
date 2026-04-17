import { api } from '../http/api'

const normalizeSummary = (summary) => {
  if (!summary) return null

  return {
    active_employees: summary.active_employees ?? summary.activeEmployees ?? 0,
    active_billable_users:
      summary.active_billable_users ?? summary.activeBillableUsers ?? summary.billable_users ?? 0,
    included_employees: summary.included_employees ?? summary.includedEmployees ?? 0,
    included_billable_users:
      summary.included_billable_users ?? summary.includedBillableUsers ?? summary.billable_limit ?? 0,
    extra_employees: summary.extra_employees ?? summary.extraEmployees ?? 0,
    extra_billable_users:
      summary.extra_billable_users ?? summary.extraBillableUsers ?? summary.extra_users ?? 0,
    extra_employee_price_cents:
      summary.extra_employee_price_cents ?? summary.extraEmployeePriceCents ?? 0,
    extra_total_cents: summary.extra_total_cents ?? summary.extraTotalCents ?? 0,
    total_price_cents: summary.total_price_cents ?? summary.totalPriceCents ?? null,
    stripe_price_id: summary.stripe_price_id ?? summary.stripePriceId ?? null,
    stripe_extra_employee_price_id:
      summary.stripe_extra_employee_price_id ?? summary.stripeExtraEmployeePriceId ?? null,
  }
}

export async function syncExtraEmployees() {
  const { data } = await api.post('/v1/admin/billing/extra-employees/sync')
  const payload = data?.data ?? data ?? {}

  return {
    message:
      payload.message ||
      'Colaboradores extras sincronizados para a proxima cobranca.',
    summary: normalizeSummary(payload.summary),
  }
}

import { api } from '../http/api'

const BASE = '/v1/admin/commercial'

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

const normalizeStep = (step = {}, index = 0) => ({
  id: step.id ?? `step-${index}`,
  name: step.name ?? '',
  position: Number(step.position ?? index),
  description: step.description ?? null,
  default_due_days: step.default_due_days ?? null,
  active: step.active !== false,
})

const normalizeUser = (user = {}) =>
  user ? { id: user.id ?? '', name: user.name ?? '', email: user.email ?? '' } : null

const normalizeAffiliate = (aff = {}) =>
  aff
    ? {
        id: aff.id ?? '',
        name: aff.name ?? '',
        slug: aff.slug ?? '',
      }
    : null

const normalizeLead = (lead = {}, index = 0) => ({
  id: lead.id ?? `lead-${index}`,
  company_name: lead.company_name ?? '',
  contact_name: lead.contact_name ?? null,
  email: lead.email ?? null,
  phone: lead.phone ?? null,
  whatsapp: lead.whatsapp ?? null,
  website: lead.website ?? null,
  country: lead.country ?? null,
  city: lead.city ?? null,
  segment: lead.segment ?? null,
  employees_count: lead.employees_count ?? null,
  source: lead.source ?? null,
  affiliate_id: lead.affiliate_id ?? null,
  current_step_id: lead.current_step_id ?? null,
  assigned_to_user_id: lead.assigned_to_user_id ?? null,
  created_by_user_id: lead.created_by_user_id ?? null,
  status: lead.status ?? 'new',
  priority: lead.priority ?? 'medium',
  score: Number(lead.score ?? 0),
  general_notes: lead.general_notes ?? null,
  next_action_type: lead.next_action_type ?? null,
  next_action_at: lead.next_action_at ?? null,
  next_action_user_id: lead.next_action_user_id ?? null,
  converted_at: lead.converted_at ?? null,
  customer_id: lead.customer_id ?? null,
  lost_reason: lead.lost_reason ?? null,
  created_at: lead.created_at ?? null,
  updated_at: lead.updated_at ?? null,
  current_step: lead.current_step ? normalizeStep(lead.current_step) : null,
  assigned_to_user: lead.assigned_to_user ? normalizeUser(lead.assigned_to_user) : null,
  affiliate: lead.affiliate ? normalizeAffiliate(lead.affiliate) : null,
  notes: Array.isArray(lead.notes) ? lead.notes : [],
  step_logs: Array.isArray(lead.step_logs) ? lead.step_logs : [],
})

const normalizeAffiliateRecord = (aff = {}, index = 0) => ({
  id: aff.id ?? `aff-${index}`,
  name: aff.name ?? '',
  email: aff.email ?? null,
  phone: aff.phone ?? null,
  slug: aff.slug ?? '',
  commission_plan_id: aff.commission_plan_id ?? null,
  status: aff.status ?? 'active',
  user_id: aff.user_id ?? null,
  referral_url: aff.referral_url ?? null,
  user: aff.user ? normalizeUser(aff.user) : null,
  commission_plan: aff.commission_plan
    ? {
        id: aff.commission_plan.id ?? '',
        name: aff.commission_plan.name ?? '',
        commission_percentage: aff.commission_plan.commission_percentage ?? '0',
        recurrence_months: aff.commission_plan.recurrence_months ?? 0,
      }
    : null,
})

const normalizeCommission = (c = {}, index = 0) => ({
  id: c.id ?? `com-${index}`,
  affiliate_id: c.affiliate_id ?? null,
  lead_id: c.lead_id ?? null,
  customer_id: c.customer_id ?? null,
  invoice_id: c.invoice_id ?? null,
  commission_plan_id: c.commission_plan_id ?? null,
  base_amount: c.base_amount ?? '0',
  commission_percentage: c.commission_percentage ?? '0',
  commission_amount: c.commission_amount ?? '0',
  month_number: c.month_number ?? 1,
  status: c.status ?? 'pending',
  due_date: c.due_date ?? null,
  paid_at: c.paid_at ?? null,
  created_at: c.created_at ?? null,
  affiliate: c.affiliate ? normalizeAffiliate(c.affiliate) : null,
})

const normalizeBonus = (b = {}, index = 0) => ({
  id: b.id ?? `bonus-${index}`,
  affiliate_id: b.affiliate_id ?? null,
  year: b.year ?? null,
  month: b.month ?? null,
  clients_count: b.clients_count ?? 0,
  bonus_every_clients: b.bonus_every_clients ?? 0,
  bonus_amount: b.bonus_amount ?? '0',
  total_bonus_amount: b.total_bonus_amount ?? '0',
  status: b.status ?? 'pending',
  paid_at: b.paid_at ?? null,
  affiliate: b.affiliate ? normalizeAffiliate(b.affiliate) : null,
})

const normalizePaginated = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : []
  const metaSource = payload?.meta ?? data?.meta ?? payload ?? {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage ?? 20,
    total: metaSource.total ?? 0,
    lastPage: metaSource.last_page ?? metaSource.lastPage ?? 1,
  }
  return { items, meta }
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function listLeads(params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.status) query.status = params.status
  if (params.priority) query.priority = params.priority
  if (params.search) query.search = params.search
  if (params.current_step_id) query.current_step_id = params.current_step_id
  if (params.assigned_to_user_id) query.assigned_to_user_id = params.assigned_to_user_id
  if (params.affiliate_id) query.affiliate_id = params.affiliate_id

  const { data } = await api.get(`${BASE}/leads`, { params: query })
  const { items, meta } = normalizePaginated(data, query.page)
  return { data: items.map((l, i) => normalizeLead(l, i)), meta }
}

export async function getLead(id) {
  const { data } = await api.get(`${BASE}/leads/${id}`)
  return normalizeLead(data?.data ?? data ?? {})
}

export async function createLead(payload = {}) {
  const { data } = await api.post(`${BASE}/leads`, payload)
  const result = {
    lead: normalizeLead(data?.data ?? data ?? {}),
    duplicate_warning: data?.duplicate_warning ?? false,
    possible_duplicates: data?.possible_duplicates ?? [],
  }
  return result
}

export async function updateLead(id, payload = {}) {
  const { data } = await api.put(`${BASE}/leads/${id}`, payload)
  return normalizeLead(data?.data ?? data ?? {})
}

export async function deleteLead(id) {
  const { data } = await api.delete(`${BASE}/leads/${id}`)
  return data?.data ?? data ?? { id }
}

export async function assignLead(id, assigned_to_user_id) {
  const { data } = await api.post(`${BASE}/leads/${id}/assign`, { assigned_to_user_id })
  return normalizeLead(data?.data ?? data ?? {})
}

export async function moveLeadStep(id, payload = {}) {
  const { data } = await api.post(`${BASE}/leads/${id}/move-step`, payload)
  return normalizeLead(data?.data ?? data ?? {})
}

export async function addLeadNote(id, note) {
  const { data } = await api.post(`${BASE}/leads/${id}/notes`, { note })
  return data?.data ?? data ?? {}
}

export async function setLeadNextAction(id, payload = {}) {
  const { data } = await api.post(`${BASE}/leads/${id}/next-action`, payload)
  return normalizeLead(data?.data ?? data ?? {})
}

export async function markLeadWon(id, payload = {}) {
  const { data } = await api.post(`${BASE}/leads/${id}/mark-won`, payload)
  return normalizeLead(data?.data ?? data ?? {})
}

export async function markLeadLost(id, payload = {}) {
  const { data } = await api.post(`${BASE}/leads/${id}/mark-lost`, payload)
  return normalizeLead(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export async function listSteps() {
  const { data } = await api.get(`${BASE}/steps`)
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return items.map((s, i) => normalizeStep(s, i))
}

export async function createStep(payload = {}) {
  const { data } = await api.post(`${BASE}/steps`, payload)
  return normalizeStep(data?.data ?? data ?? {})
}

export async function updateStep(id, payload = {}) {
  const { data } = await api.put(`${BASE}/steps/${id}`, payload)
  return normalizeStep(data?.data ?? data ?? {})
}

export async function deleteStep(id) {
  const { data } = await api.delete(`${BASE}/steps/${id}`)
  return data?.data ?? data ?? { id }
}

export async function reorderSteps(steps = []) {
  const { data } = await api.post(`${BASE}/steps/reorder`, { steps })
  return data?.data ?? data ?? {}
}

// ---------------------------------------------------------------------------
// Affiliates
// ---------------------------------------------------------------------------

export async function listAffiliates(params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page

  const { data } = await api.get(`${BASE}/affiliates`, { params: query })
  const { items, meta } = normalizePaginated(data, query.page)
  return { data: items.map((a, i) => normalizeAffiliateRecord(a, i)), meta }
}

export async function getAffiliate(id) {
  const { data } = await api.get(`${BASE}/affiliates/${id}`)
  return normalizeAffiliateRecord(data?.data ?? data ?? {})
}

export async function createAffiliate(payload = {}) {
  const { data } = await api.post(`${BASE}/affiliates`, payload)
  return normalizeAffiliateRecord(data?.data ?? data ?? {})
}

export async function updateAffiliate(id, payload = {}) {
  const { data } = await api.put(`${BASE}/affiliates/${id}`, payload)
  return normalizeAffiliateRecord(data?.data ?? data ?? {})
}

export async function deleteAffiliate(id) {
  const { data } = await api.delete(`${BASE}/affiliates/${id}`)
  return data?.data ?? data ?? { id }
}

export async function getAffiliateMetrics(id) {
  const { data } = await api.get(`${BASE}/affiliates/${id}/metrics`)
  return data?.data ?? data ?? {}
}

// ---------------------------------------------------------------------------
// Commissions
// ---------------------------------------------------------------------------

export async function listCommissions(params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.affiliate_id) query.affiliate_id = params.affiliate_id
  if (params.status) query.status = params.status

  const { data } = await api.get(`${BASE}/commissions`, { params: query })
  const { items, meta } = normalizePaginated(data, query.page)
  return { data: items.map((c, i) => normalizeCommission(c, i)), meta }
}

export async function approveCommission(id) {
  const { data } = await api.post(`${BASE}/commissions/${id}/approve`)
  return normalizeCommission(data?.data ?? data ?? {})
}

export async function markCommissionPaid(id) {
  const { data } = await api.post(`${BASE}/commissions/${id}/mark-paid`)
  return normalizeCommission(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Bonuses
// ---------------------------------------------------------------------------

export async function listBonuses(params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.affiliate_id) query.affiliate_id = params.affiliate_id
  if (params.year) query.year = params.year
  if (params.month) query.month = params.month

  const { data } = await api.get(`${BASE}/affiliate-bonuses`, { params: query })
  const { items, meta } = normalizePaginated(data, query.page)
  return { data: items.map((b, i) => normalizeBonus(b, i)), meta }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getCommercialDashboard() {
  const { data } = await api.get(`${BASE}/dashboard`)
  return data?.data ?? data ?? {}
}

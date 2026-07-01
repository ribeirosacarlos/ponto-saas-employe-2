import { api } from '../http/api'

const PORTAL = '/v1/affiliate-portal'

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

// ---------------------------------------------------------------------------
// Normalizers (inline — afiliado não usa o serviço admin)
// ---------------------------------------------------------------------------

const normalizeAffiliateLead = (lead = {}, index = 0) => ({
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
  current_step: lead.current_step
    ? { id: lead.current_step.id ?? '', name: lead.current_step.name ?? '', position: Number(lead.current_step.position ?? 0) }
    : null,
  notes: Array.isArray(lead.notes) ? lead.notes : [],
  step_logs: Array.isArray(lead.step_logs) ? lead.step_logs : [],
})

const normalizePage = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  const m = payload?.meta ?? data?.meta ?? payload ?? {}
  return {
    items,
    meta: {
      currentPage: m.current_page ?? m.currentPage ?? fallbackPage,
      perPage: m.per_page ?? m.perPage ?? 20,
      total: m.total ?? 0,
      lastPage: m.last_page ?? m.lastPage ?? 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function acceptAffiliateInvite(payload) {
  const { data } = await api.post('/v1/invites/affiliate/accept', payload, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function affiliateLogin(email, password) {
  const { data } = await api.post('/v1/auth/affiliate/login', { email, password }, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function getAffiliateMe(token) {
  const { data } = await api.get(`${PORTAL}/me`, authHeader(token))
  return data?.data ?? data ?? {}
}

export async function affiliateLogout(token) {
  await api.post('/v1/affiliate/logout', {}, authHeader(token))
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getAffiliateDashboard(token) {
  const { data } = await api.get(`${PORTAL}/dashboard`, authHeader(token))
  return data?.data ?? data ?? {}
}

// ---------------------------------------------------------------------------
// Steps (read-only — affiliate role has read access to /admin/commercial/steps)
// ---------------------------------------------------------------------------

export async function listAffiliateSteps(token) {
  const { data } = await api.get(`${PORTAL}/steps`, authHeader(token))
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function listAffiliateLeads(token, params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.status) query.status = params.status
  if (params.priority) query.priority = params.priority
  if (params.current_step_id) query.current_step_id = params.current_step_id
  if (params.search) query.search = params.search

  const { data } = await api.get(`${PORTAL}/leads`, { ...authHeader(token), params: query })
  const { items, meta } = normalizePage(data, query.page)
  return { data: items.map((l, i) => normalizeAffiliateLead(l, i)), meta }
}

export async function createAffiliateLead(token, payload = {}) {
  const { data } = await api.post(`${PORTAL}/leads`, payload, authHeader(token))
  return {
    lead: normalizeAffiliateLead(data?.data ?? data ?? {}),
    duplicate_warning: data?.duplicate_warning ?? false,
    possible_duplicates: data?.possible_duplicates ?? [],
  }
}

export async function getAffiliateLead(token, id) {
  const { data } = await api.get(`${PORTAL}/leads/${id}`, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

export async function updateAffiliateLead(token, id, payload = {}) {
  const { data } = await api.put(`${PORTAL}/leads/${id}`, payload, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

export async function addAffiliateLeadNote(token, id, note) {
  const { data } = await api.post(`${PORTAL}/leads/${id}/notes`, { note }, authHeader(token))
  return data?.data ?? data ?? {}
}

export async function setAffiliateLeadNextAction(token, id, payload = {}) {
  const { data } = await api.post(`${PORTAL}/leads/${id}/next-action`, payload, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

export async function moveAffiliateLeadStep(token, id, payload = {}) {
  const { data } = await api.post(`${PORTAL}/leads/${id}/move-step`, payload, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

export async function markAffiliateLeadWon(token, id, payload = {}) {
  const { data } = await api.post(`${PORTAL}/leads/${id}/mark-won`, payload, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

export async function markAffiliateLeadLost(token, id, payload = {}) {
  const { data } = await api.post(`${PORTAL}/leads/${id}/mark-lost`, payload, authHeader(token))
  return normalizeAffiliateLead(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Comissões
// ---------------------------------------------------------------------------

export async function listAffiliateCommissions(token, params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.status) query.status = params.status

  const { data } = await api.get(`${PORTAL}/commissions`, { ...authHeader(token), params: query })
  const { items, meta } = normalizePage(data, query.page)
  return {
    data: items.map((c, i) => ({
      id: c.id ?? `com-${i}`,
      lead_id: c.lead_id ?? null,
      base_amount: c.base_amount ?? '0',
      commission_percentage: c.commission_percentage ?? '0',
      commission_amount: c.commission_amount ?? '0',
      month_number: c.month_number ?? 1,
      status: c.status ?? 'pending',
      due_date: c.due_date ?? null,
      paid_at: c.paid_at ?? null,
    })),
    meta,
  }
}

// ---------------------------------------------------------------------------
// Partner Portal Auth (new dedicated endpoints — separate from legacy affiliate auth)
// ---------------------------------------------------------------------------

export async function partnerLogin(email, password) {
  return affiliateLogin(email, password)
}

export async function partnerLogout(token) {
  await affiliateLogout(token)
}

export async function acceptPartnerInvite(payload) {
  return acceptAffiliateInvite(payload)
}

export async function affiliateForgotPassword(email) {
  const { data } = await api.post('/v1/auth/affiliate/forgot-password', { email }, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function partnerForgotPassword(email) {
  return affiliateForgotPassword(email)
}

export async function affiliateResetPassword(payload) {
  const { data } = await api.post('/v1/auth/affiliate/reset-password', payload, { skipAuth: true })
  return data?.data ?? data ?? {}
}

export async function partnerResetPassword(payload) {
  return affiliateResetPassword(payload)
}

// ---------------------------------------------------------------------------
// Bônus
// ---------------------------------------------------------------------------

export async function listAffiliateBonuses(token, params = {}) {
  const query = { page: params.page ?? 1 }
  if (params.per_page) query.per_page = params.per_page
  if (params.year) query.year = params.year
  if (params.month) query.month = params.month

  const { data } = await api.get(`${PORTAL}/bonuses`, { ...authHeader(token), params: query })
  const { items, meta } = normalizePage(data, query.page)
  return {
    data: items.map((b, i) => ({
      id: b.id ?? `bonus-${i}`,
      year: b.year ?? null,
      month: b.month ?? null,
      clients_count: b.clients_count ?? 0,
      bonus_every_clients: b.bonus_every_clients ?? 0,
      bonus_amount: b.bonus_amount ?? '0',
      total_bonus_amount: b.total_bonus_amount ?? '0',
      status: b.status ?? 'pending',
      paid_at: b.paid_at ?? null,
    })),
    meta,
  }
}

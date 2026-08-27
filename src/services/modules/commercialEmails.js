import { api } from '../http/api'

const BASE = '/v1/admin/commercial'
const EMAIL_BASE = `${BASE}/email`

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

const normalizeTemplate = (t = {}, index = 0) => ({
  id: t.id ?? `template-${index}`,
  name: t.name ?? '',
  slug: t.slug ?? '',
  category: t.category ?? null,
  subject: t.subject ?? '',
  body_html: t.body_html ?? '',
  body_text: t.body_text ?? null,
  available_variables: Array.isArray(t.available_variables) ? t.available_variables : [],
  is_active: t.is_active !== false,
  created_by_user_id: t.created_by_user_id ?? null,
  created_at: t.created_at ?? null,
  updated_at: t.updated_at ?? null,
})

const normalizeStepTemplate = (t = {}) => ({
  id: t.id ?? '',
  name: t.name ?? '',
  slug: t.slug ?? '',
})

const normalizeSequenceStep = (s = {}, index = 0) => ({
  id: s.id ?? `step-${index}`,
  sequence_id: s.sequence_id ?? null,
  template_id: s.template_id ?? null,
  position: Number(s.position ?? index + 1),
  name: s.name ?? null,
  delay_days: Number(s.delay_days ?? 0),
  send_time_override: s.send_time_override ?? null,
  is_active: s.is_active !== false,
  template: s.template ? normalizeStepTemplate(s.template) : null,
})

const normalizeSequence = (s = {}, index = 0) => ({
  id: s.id ?? `sequence-${index}`,
  name: s.name ?? '',
  description: s.description ?? null,
  status: s.status ?? 'draft',
  timezone: s.timezone ?? null,
  created_by_user_id: s.created_by_user_id ?? null,
  created_at: s.created_at ?? null,
  updated_at: s.updated_at ?? null,
  steps: Array.isArray(s.steps) ? s.steps.map((step, i) => normalizeSequenceStep(step, i)) : [],
})

const normalizeSend = (s = {}, index = 0) => ({
  id: s.id ?? `send-${index}`,
  to_email: s.to_email ?? null,
  rendered_subject: s.rendered_subject ?? null,
  status: s.status ?? 'queued',
  sent_at: s.sent_at ?? null,
  delivered_at: s.delivered_at ?? null,
  opened_at: s.opened_at ?? null,
  first_clicked_at: s.first_clicked_at ?? null,
  bounced_at: s.bounced_at ?? null,
  failure_reason: s.failure_reason ?? null,
  template: s.template ? { id: s.template.id ?? '', name: s.template.name ?? '' } : null,
})

const normalizeEnrollment = (e = {}, index = 0) => ({
  id: e.id ?? `enrollment-${index}`,
  lead_id: e.lead_id ?? null,
  sequence_id: e.sequence_id ?? null,
  status: e.status ?? 'active',
  exit_reason: e.exit_reason ?? null,
  current_step_id: e.current_step_id ?? null,
  next_step_id: e.next_step_id ?? null,
  next_send_at: e.next_send_at ?? null,
  enrolled_at: e.enrolled_at ?? null,
  enrolled_by_user_id: e.enrolled_by_user_id ?? null,
  paused_at: e.paused_at ?? null,
  pause_reason: e.pause_reason ?? null,
  replied_at: e.replied_at ?? null,
  completed_at: e.completed_at ?? null,
  cancelled_at: e.cancelled_at ?? null,
  sequence: e.sequence ? { id: e.sequence.id ?? '', name: e.sequence.name ?? '' } : null,
  current_step: e.current_step ? { id: e.current_step.id ?? '', name: e.current_step.name ?? '', position: e.current_step.position ?? null } : null,
  next_step: e.next_step ? { id: e.next_step.id ?? '', name: e.next_step.name ?? '', position: e.next_step.position ?? null } : null,
  sends: Array.isArray(e.sends) ? e.sends.map((send, i) => normalizeSend(send, i)) : [],
})

const normalizeEmailTimeline = (payload = {}) => ({
  is_email_suppressed: !!payload.is_email_suppressed,
  enrollments: Array.isArray(payload.enrollments) ? payload.enrollments.map((e, i) => normalizeEnrollment(e, i)) : [],
})

const normalizeEmailSettings = (s = {}) => ({
  id: s.id ?? null,
  is_globally_paused: !!s.is_globally_paused,
  paused_at: s.paused_at ?? null,
  pause_reason: s.pause_reason ?? null,
  daily_send_limit: Number(s.daily_send_limit ?? 80),
  monthly_send_limit: Number(s.monthly_send_limit ?? 2400),
  sending_window_start_time: s.sending_window_start_time ?? null,
  sending_window_end_time: s.sending_window_end_time ?? null,
  sending_days: Array.isArray(s.sending_days) ? s.sending_days : [],
  timezone: s.timezone ?? null,
  min_gap_seconds_between_sends: Number(s.min_gap_seconds_between_sends ?? 45),
  max_sends_per_dispatch_run: Number(s.max_sends_per_dispatch_run ?? 6),
  bounce_soft_threshold: Number(s.bounce_soft_threshold ?? 2),
  updated_at: s.updated_at ?? null,
})

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listEmailTemplates() {
  const { data } = await api.get(`${EMAIL_BASE}/templates`)
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return items.map((t, i) => normalizeTemplate(t, i))
}

export async function createEmailTemplate(payload = {}) {
  const { data } = await api.post(`${EMAIL_BASE}/templates`, payload)
  return normalizeTemplate(data?.data ?? data ?? {})
}

export async function updateEmailTemplate(id, payload = {}) {
  const { data } = await api.put(`${EMAIL_BASE}/templates/${id}`, payload)
  return normalizeTemplate(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Sequences
// ---------------------------------------------------------------------------

export async function listEmailSequences() {
  const { data } = await api.get(`${EMAIL_BASE}/sequences`)
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return items.map((s, i) => normalizeSequence(s, i))
}

export async function getEmailSequence(id) {
  const { data } = await api.get(`${EMAIL_BASE}/sequences/${id}`)
  return normalizeSequence(data?.data ?? data ?? {})
}

export async function createEmailSequence(payload = {}) {
  const { data } = await api.post(`${EMAIL_BASE}/sequences`, payload)
  return normalizeSequence(data?.data ?? data ?? {})
}

export async function updateEmailSequence(id, payload = {}) {
  const { data } = await api.put(`${EMAIL_BASE}/sequences/${id}`, payload)
  return normalizeSequence(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Sequence Steps
// ---------------------------------------------------------------------------

export async function createSequenceStep(sequenceId, payload = {}) {
  const { data } = await api.post(`${EMAIL_BASE}/sequences/${sequenceId}/steps`, payload)
  return normalizeSequenceStep(data?.data ?? data ?? {})
}

export async function updateSequenceStep(sequenceId, stepId, payload = {}) {
  const { data } = await api.put(`${EMAIL_BASE}/sequences/${sequenceId}/steps/${stepId}`, payload)
  return normalizeSequenceStep(data?.data ?? data ?? {})
}

export async function deleteSequenceStep(sequenceId, stepId) {
  const { data } = await api.delete(`${EMAIL_BASE}/sequences/${sequenceId}/steps/${stepId}`)
  return data?.data ?? data ?? { id: stepId }
}

export async function reorderSequenceSteps(sequenceId, steps = []) {
  const { data } = await api.put(`${EMAIL_BASE}/sequences/${sequenceId}/steps/reorder`, { steps })
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return items.map((s, i) => normalizeSequenceStep(s, i))
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function bulkEnrollLeads(sequence_id, lead_ids = []) {
  const { data } = await api.post(`${EMAIL_BASE}/enrollments`, { sequence_id, lead_ids })
  const items = Array.isArray(data?.data) ? data.data : []
  return {
    data: items.map((item, i) => ({
      index: item.index ?? i,
      lead_id: item.lead_id ?? null,
      status: item.status ?? 'error',
      enrollment: item.enrollment ? normalizeEnrollment(item.enrollment) : null,
      errors: item.errors ?? null,
    })),
    meta: data?.meta ?? { total: lead_ids.length, enrolled: 0, failed: 0 },
  }
}

export async function pauseEnrollment(id, reason) {
  const { data } = await api.post(`${EMAIL_BASE}/enrollments/${id}/pause`, reason ? { reason } : {})
  return normalizeEnrollment(data?.data ?? data ?? {})
}

export async function resumeEnrollment(id) {
  const { data } = await api.post(`${EMAIL_BASE}/enrollments/${id}/resume`)
  return normalizeEnrollment(data?.data ?? data ?? {})
}

export async function cancelEnrollment(id) {
  const { data } = await api.post(`${EMAIL_BASE}/enrollments/${id}/cancel`)
  return normalizeEnrollment(data?.data ?? data ?? {})
}

export async function markEnrollmentReplied(id) {
  const { data } = await api.post(`${EMAIL_BASE}/enrollments/${id}/mark-replied`)
  return normalizeEnrollment(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Lead email timeline
// ---------------------------------------------------------------------------

export async function getLeadEmailTimeline(leadId) {
  const { data } = await api.get(`${BASE}/leads/${leadId}/email-timeline`)
  return normalizeEmailTimeline(data?.data ?? data ?? {})
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getEmailSettings() {
  const { data } = await api.get(`${EMAIL_BASE}/settings`)
  return normalizeEmailSettings(data?.data ?? data ?? {})
}

export async function updateEmailSettings(payload = {}) {
  const { data } = await api.put(`${EMAIL_BASE}/settings`, payload)
  return normalizeEmailSettings(data?.data ?? data ?? {})
}

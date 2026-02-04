import { api } from "./http/api"
import { formatBytes } from "../lib/formatBytes"

const WARNED = new Set()
const warnOnce = (key, message) => {
  if (WARNED.has(key)) return
  WARNED.add(key)
  console.warn(message)
}
const normalizeAdminDocument = (item = {}, index = 0) => {
  const status = (item.status ?? item.state ?? "").toString().toLowerCase()
  const category = (item.category ?? item.type ?? "").toString().toLowerCase()
  const sizeBytes = item.size_bytes ?? item.sizeBytes ?? item.size ?? null
  const priority = (item.priority ?? item.priority_level ?? item.priorityLevel ?? "").toString().toLowerCase()
  const isImportant = Boolean(
    item.is_important ?? item.isImportant ?? item.important ?? item.requires_signature ?? item.requiresSignature,
  )
  const signatureStatus = (
    item.signature_status ??
    item.signatureStatus ??
    item.signature_state ??
    item.signatureState ??
    ""
  )
    .toString()
    .toLowerCase()
  const signedAt = item.signed_at ?? item.signedAt ?? item.signature_signed_at ?? item.signatureSignedAt
  const lastViewedAt =
    item.last_viewed_at ??
    item.lastViewedAt ??
    item.viewed_at ??
    item.viewedAt ??
    item.last_seen_at ??
    item.lastSeenAt
  const resolvedSignatureStatus =
    signatureStatus || (signedAt ? "signed" : isImportant ? "pending" : "")

  return {
    ...item,
    id: item.id ?? item.uuid ?? `admin-document-${index}`,
    title: item.title ?? item.name ?? item.filename ?? "Documento",
    category,
    status,
    priority,
    isImportant,
    requiresSignature: isImportant,
    signatureStatus: resolvedSignatureStatus,
    signedAt,
    lastViewedAt,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    extension: item.extension ?? item.ext ?? item.file_extension ?? "",
    updatedAt: item.updated_at ?? item.updatedAt ?? item.modified_at ?? item.created_at ?? "",
    user: item.user ?? item.employee ?? item.owner ?? null,
    employee: item.employee ?? item.user ?? null,
  }
}

const normalizePaginated = (data, fallbackPage = 1, fallbackPerPage) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : []
  const metaSource = data?.meta || payload?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage ?? fallbackPerPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { items, meta }
}

export async function listPending(params = {}) {
  const { page = 1, category, search, employee } = params
  const query = {}
  if (page) query.page = page
  if (category && category !== "all") query.category = category
  if (search) query.search = search
  if (employee) query.employee = employee

  const { data } = await api.get("/v1/admin/documents/pending", { params: query })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((item, index) => normalizeAdminDocument(item, index)), meta }
}

export async function listReview(params = {}) {
  const { page = 1, category, search, employee } = params
  const query = {}
  if (page) query.page = page
  if (category && category !== "all") query.category = category
  if (search) query.search = search
  if (employee) query.employee = employee

  const { data } = await api.get("/v1/admin/documents/review", { params: query })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((item, index) => normalizeAdminDocument(item, index)), meta }
}

export async function adminGet(id) {
  const { data } = await api.get(`/v1/admin/documents/${id}`)
  return normalizeAdminDocument(data?.data ?? data ?? {}, 0)
}

export async function approve(id) {
  const { data } = await api.patch(`/v1/admin/documents/${id}/approve`)
  return data?.data ?? data
}

export async function reject(id, comment) {
  const body = { comment }
  const { data } = await api.patch(`/v1/admin/documents/${id}/reject`, body)
  return data?.data ?? data
}

export async function uploadTeamDocument(payload) {
  // TODO: wire admin document upload endpoint when backend is ready.
  warnOnce('admin-document-upload', '[adminDocumentsService] Missing admin upload endpoint.')
  return {
    id: `admin-document-${Date.now()}`,
    mocked: true,
    payload,
  }
}


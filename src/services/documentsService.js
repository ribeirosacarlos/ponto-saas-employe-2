import { api } from "./http/api"
import { formatBytes } from "../lib/formatBytes"

const WARNED = new Set()
const warnOnce = (key, message) => {
  if (WARNED.has(key)) return
  WARNED.add(key)
  console.warn(message)
}
const normalizeDocument = (item = {}, index = 0) => {
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
    id: item.id ?? item.uuid ?? `document-${index}`,
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
    rejectedComment: item.rejected_comment ?? item.rejection_comment ?? item.comment ?? item.notes ?? "",
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

export async function listMyDocuments({ page = 1, status, category, search } = {}) {
  const params = {}
  if (page) params.page = page
  if (status && status !== "all") params.status = status
  if (category && category !== "all") params.category = category
  if (search) params.search = search

  const { data } = await api.get("/v1/documents", { params })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((item, index) => normalizeDocument(item, index)), meta }
}

export async function uploadDocuments(formData) {
  const { data } = await api.post("/v1/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data?.data ?? data
}

export async function getDocument(id) {
  const { data } = await api.get(`/v1/documents/${id}`)
  return normalizeDocument(data?.data ?? data ?? {}, 0)
}

export function viewDocumentUrl(id) {
  const base = api.defaults.baseURL?.replace(/\/$/, "") || ""
  return `${base}/v1/documents/${id}/view`
}

export async function fetchDocumentBlob(id) {
  const response = await api.get(`/v1/documents/${id}/view`, { responseType: "blob" })
  const contentType =
    response.headers?.["content-type"] ||
    response.headers?.["Content-Type"] ||
    response.data?.type ||
    "application/octet-stream"
  const disposition =
    response.headers?.["content-disposition"] ||
    response.headers?.["Content-Disposition"] ||
    ""
  return { blob: response.data, mimeType: contentType, disposition, response }
}

export async function downloadDocument(id, fallbackFilename = "document.pdf") {
  const response = await api.get(`/v1/documents/${id}/download`, { responseType: "blob" })
  const { downloadBlob } = await import("../utils/pdf/downloadBlob")
  downloadBlob({ response, fallbackFilename })
}

export async function deleteDocument(id) {
  const { data } = await api.delete(`/v1/documents/${id}`)
  return data?.data ?? data
}

export async function resendDocument(id, formData) {
  const { data } = await api.post(`/v1/documents/${id}/resend`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data?.data ?? data
}

export async function trackDocumentView(documentId) {
  if (!documentId) return null
  const error = new Error('Document view tracking endpoint is not implemented.')
  error.code = 'DOCUMENT_VIEW_TRACKING_UNAVAILABLE'
  warnOnce('documents-view', '[documentsService] Missing document view tracking endpoint.')
  throw error
}

export async function trackDocumentSignature(documentId) {
  if (!documentId) return null
  const error = new Error('Document signature endpoint is not implemented.')
  error.code = 'DOCUMENT_SIGNATURE_UNAVAILABLE'
  warnOnce('documents-signature', '[documentsService] Missing document signature endpoint.')
  throw error
}



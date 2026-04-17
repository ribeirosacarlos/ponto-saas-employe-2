import { api } from '../http/api'

const BASE = '/v1/admin/areas'

export const normalizeArea = (area = {}, index = 0) => ({
  id: area?.id ?? area?.uuid ?? area?.area_id ?? `area-${index}`,
  company_id: area?.company_id ?? area?.companyId ?? null,
  name: area?.name ?? area?.title ?? area?.label ?? '',
})

const normalizePaginated = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.areas)
        ? payload.areas
        : []

  const metaSource = data?.meta || payload?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? metaSource.page ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }

  return { items, meta }
}

export async function listAreas({ page = 1, perPage } = {}) {
  const params = {}
  if (page) params.page = page
  if (perPage) params.per_page = perPage

  const { data } = await api.get(BASE, { params })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((item, index) => normalizeArea(item, index)), meta }
}

export async function createArea(payload = {}) {
  const { data } = await api.post(BASE, payload)
  return normalizeArea(data?.data ?? data ?? {}, 0)
}

export async function updateArea(id, payload = {}) {
  if (!id) return null
  const { data } = await api.put(`${BASE}/${id}`, payload)
  return normalizeArea(data?.data ?? data ?? {}, 0)
}

export async function deleteArea(id) {
  if (!id) return null
  const { data } = await api.delete(`${BASE}/${id}`)
  return data?.data ?? data ?? { id }
}

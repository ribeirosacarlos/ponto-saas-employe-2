import { api } from './http/api'

const normalizeHoliday = (item = {}, index = 0) => ({
  ...item,
  id: item.id ?? `holiday-${index}`,
  date: typeof item.date === 'string' ? item.date.slice(0, 10) : '',
  name: item.name ?? '',
  scope: (item.scope ?? 'national').toLowerCase(),
  companyId: item.company_id ?? item.companyId ?? '',
  createdAt: item.created_at ?? item.createdAt ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? '',
})

const normalizePaginated = (data, fallbackPage = 1) => {
  const payload = data?.data ?? data
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  const metaSource = data?.meta || payload?.meta || data || {}
  const meta = {
    currentPage: metaSource.current_page ?? metaSource.currentPage ?? fallbackPage,
    perPage: metaSource.per_page ?? metaSource.perPage ?? 50,
    total: metaSource.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage,
  }
  return { items, meta }
}

export async function listHolidays(params = {}) {
  const { page = 1, start, end, scope } = params
  const query = { page }
  if (start) query.start = start
  if (end) query.end = end
  if (scope && scope !== 'all') query.scope = scope

  const { data } = await api.get('/v1/holidays', { params: query })
  const { items, meta } = normalizePaginated(data, page)
  return { data: items.map((item, index) => normalizeHoliday(item, index)), meta }
}

export async function createHoliday(payload) {
  const { data } = await api.post('/v1/admin/holidays', payload)
  return normalizeHoliday(data?.data ?? data ?? {})
}

export async function updateHoliday(id, payload) {
  const { data } = await api.put(`/v1/admin/holidays/${id}`, payload)
  return normalizeHoliday(data?.data ?? data ?? {})
}

export async function deleteHoliday(id) {
  const { data } = await api.delete(`/v1/admin/holidays/${id}`)
  return data
}

import { api } from '../http/api'

const ENTRIES_CACHE_MS = 15 * 1000 // 15s cache to squash duplicate rapid requests
const entriesCache = new Map()
const entriesInflight = new Map()

const parseEntriesResponse = (data, { page, perPage }) => {
  const payload = data?.data && !Array.isArray(data.data) ? data.data : data
  const entries = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.entries)
        ? payload.entries
        : []

  const metaSource = data?.meta || payload?.meta || payload || {}
  const meta = {
    currentPage:
      metaSource.current_page ?? metaSource.currentPage ?? payload?.current_page ?? metaSource.page ?? page,
    perPage: metaSource.per_page ?? metaSource.perPage ?? payload?.per_page ?? perPage,
    total: metaSource.total ?? payload?.total,
    lastPage: metaSource.last_page ?? metaSource.lastPage ?? payload?.last_page,
  }

  return { data: entries, meta }
}

const extractClockedAt = (entry) =>
  entry?.clocked_at ||
  entry?.clockedAt ||
  entry?.date ||
  entry?.timestamp ||
  entry?.created_at ||
  null

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const ALLOWED_PROPOSED_TYPES = ['in', 'out']
const normalizeProposedType = (value) => {
  if (value === undefined || value === null) return null
  const normalized = String(value).toLowerCase()
  return ALLOWED_PROPOSED_TYPES.includes(normalized) ? normalized : null
}

const hasFiniteNumber = (value) => Number.isFinite(Number(value))

export async function clockRequest(typeOrCoords = {}, maybeCoords = {}) {
  // Backward compatibility: previous signature was (type, coords). Type is ignored by the API now.
  const coords = typeof typeOrCoords === 'string' ? maybeCoords : typeOrCoords || {}
  const payload = {}

  if (coords.clockedAt) payload.clocked_at = coords.clockedAt
  if (hasFiniteNumber(coords.latitude)) payload.latitude = Number(coords.latitude)
  if (hasFiniteNumber(coords.longitude)) payload.longitude = Number(coords.longitude)
  if (coords.source) payload.source = coords.source

  const response = await api.post('/v1/employee/clock', payload, {
    skipAccessDeniedHandling: true,
  })
  const { data: rawData, status: httpStatus } = response
  const payloadData = rawData?.data ?? rawData ?? {}

  const entry =
    httpStatus === 201
      ? payloadData.entry ?? payloadData.time_entry ?? payloadData.entry_data ?? payloadData
      : null
  const nextEvent = payloadData.next_event ?? payloadData.nextEvent ?? null
  const adjustment = payloadData.adjustment ?? payloadData.adjustment_request ?? null
  const normalizedStatus =
    httpStatus === 202 || payloadData.status === 'adjustment_requested'
      ? 'adjustment_requested'
      : 'created'

  return {
    status: normalizedStatus,
    httpStatus,
    entry,
    next_event: nextEvent,
    adjustment,
    raw: payloadData,
  }
}

export async function getEmployeeEntries(params = {}) {
  const {
    from,
    to,
    page = 1,
    perPage = 20,
    preferLatestPage = true,
    forceRefresh = false,
  } = params

  const cacheKey = JSON.stringify({ from: from || null, to: to || null, page, perPage, preferLatestPage })

  if (!forceRefresh) {
    const cached = entriesCache.get(cacheKey)
    if (cached && Date.now() - cached.time < ENTRIES_CACHE_MS) {
      return cached.value
    }
    const inflight = entriesInflight.get(cacheKey)
    if (inflight) return inflight
  }

  const buildParams = (pageValue) => {
    const query = {}
    if (pageValue) query.page = pageValue
    if (perPage) query.per_page = perPage
    if (from) query.from = from
    if (to) query.to = to
    return query
  }

  const fetchPage = async (pageValue) => {
    const { data } = await api.get('/v1/employee/entries', { params: buildParams(pageValue) })
    return { data, pageValue }
  }

  const loadEntries = async () => {
    let response = await fetchPage(page)
    let parsed = parseEntriesResponse(response.data, { page, perPage })

    if (preferLatestPage && page === 1 && parsed.meta.lastPage && parsed.meta.lastPage > 1) {
      const today = new Date()
      const filterAllowsToday = (!from || new Date(from) <= today) && (!to || new Date(to) >= today)
      const hasTodayEntry =
        filterAllowsToday &&
        parsed.data.some((entry) => {
          const value = extractClockedAt(entry)
          if (!value) return false
          const dt = new Date(value)
          return !isNaN(dt) && isSameDay(dt, today)
        })

      if (!hasTodayEntry && parsed.meta.currentPage === 1) {
        response = await fetchPage(parsed.meta.lastPage)
        parsed = parseEntriesResponse(response.data, { page: parsed.meta.lastPage, perPage })
      }
    }

    entriesCache.set(cacheKey, { value: parsed, time: Date.now() })
    return parsed
  }

  const promise = loadEntries()
  entriesInflight.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    entriesInflight.delete(cacheKey)
  }
}

export async function listEntries(pageOrOptions = 1) {
  const options =
    typeof pageOrOptions === 'object' && pageOrOptions !== null
      ? pageOrOptions
      : { page: pageOrOptions }
  const { data, meta } = await getEmployeeEntries(options)
  return { data, meta }
}

export async function requestAdjustment(timeEntryOrPayload, maybePayload = null) {
  // Accept both the newer signature (timeEntryId, payload) and legacy payload-only calls.
  const payload = maybePayload || timeEntryOrPayload || {}
  const timeEntryIdSource = maybePayload ? timeEntryOrPayload : payload

  const maybeId =
    (typeof timeEntryIdSource === 'string' ? timeEntryIdSource : null) ??
    (timeEntryIdSource && timeEntryIdSource.timeEntryId) ??
    timeEntryIdSource?.time_entry_id ??
    timeEntryIdSource?.time_entry ??
    timeEntryIdSource?.entry_id ??
    timeEntryIdSource?.entryId
  const timeEntryId = timeEntryIdSource?.id && !maybeId ? timeEntryIdSource.id : maybeId

  if (!timeEntryId) {
    throw new Error('requestAdjustment requires a timeEntryId')
  }

  const normalizedPayload = {
    proposed_clocked_at:
      payload?.proposed_clocked_at ??
      payload?.proposedClockedAt ??
      payload?.corrected_time ??
      payload?.clocked_at ??
      payload?.clockedAt ??
      null,
    reason: payload?.reason ?? payload?.adjustment_reason ?? payload?.justification ?? payload?.notes ?? '',
  }

  // Remove undefined/null keys to avoid validation errors.
  Object.keys(normalizedPayload).forEach((key) => {
    if (normalizedPayload[key] === undefined || normalizedPayload[key] === null) {
      delete normalizedPayload[key]
    }
  })

  const { data } = await api.post(`/v1/employee/time-entries/${timeEntryId}/adjustment`, normalizedPayload)
  return data
}

const normalizeEmployeeAdjustment = (item = {}, index = 0) => ({
  id: item.id ?? `adjustment-${index}`,
  status: String(item.adjustment_status ?? item.status ?? '').toLowerCase(),
  originalTime: item.clocked_at ?? null,
  correctedTime: item.proposed_clocked_at ?? item.clocked_at ?? null,
  reason: item.adjustment_reason ?? item.reason ?? '',
  createdAt: item.adjustment_requested_at ?? item.created_at ?? null,
  reviewedAt: item.adjustment_reviewed_at ?? null,
  reviewReason: item.adjustment_review_reason ?? '',
})

export async function listEmployeeAdjustments({ status, page = 1 } = {}) {
  const params = { page }
  if (status && status !== 'all') params.status = status

  const { data } = await api.get('/v1/employee/adjustments', { params })
  const payload = data?.data ?? data
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  const meta = {
    currentPage: payload?.current_page ?? page,
    perPage: payload?.per_page ?? 15,
    total: payload?.total ?? 0,
    lastPage: payload?.last_page ?? 1,
  }

  return { data: items.map(normalizeEmployeeAdjustment), meta }
}

export async function breakRequest(action, coords = {}) {
  const actionLabel = action === 'start' ? 'start' : 'end'
  throw new Error(
    `Break clocking (${actionLabel}) is no longer supported by the API. Use regular in/out clocking instead.`,
  )
}

export async function startBreak(coords = {}) {
  return breakRequest('start', coords)
}

export async function endBreak(coords = {}) {
  return breakRequest('end', coords)
}

let workedTodayCache = null
let workedTodayFetchedAt = 0
let workedTodayInflight = null
const WORKED_TODAY_CACHE_MS = 60 * 1000 // 1 minute cache to avoid duplicate calls on load

export async function getWorkedToday(forceRefresh = false) {
  const now = Date.now()
  const cacheValid = !forceRefresh && workedTodayCache && now - workedTodayFetchedAt < WORKED_TODAY_CACHE_MS
  if (cacheValid) return workedTodayCache

  if (!forceRefresh && workedTodayInflight) {
    return workedTodayInflight
  }

  if (forceRefresh) {
    workedTodayCache = null
    workedTodayFetchedAt = 0
  }

  workedTodayInflight = (async () => {
    const { data } = await api.get('/v1/employee/worked-today')
    const payload = data?.data || data || {}
    const normalized = {
      ...payload,
      workedMinutes: payload.worked_minutes ?? payload.workedMinutes,
      workedSeconds: payload.worked_seconds ?? payload.workedSeconds,
    }
    workedTodayCache = normalized
    workedTodayFetchedAt = Date.now()
    workedTodayInflight = null
    return normalized
  })()

  return workedTodayInflight
}

export async function getOpenTimeEntryStatus() {
  const { data } = await api.get('/v1/employee/time-entries/open-status')
  const payload = data?.data ?? data ?? {}

  const shiftDayRaw = payload.shift_day ?? payload.shiftDay ?? null
  const shiftDay =
    shiftDayRaw && typeof shiftDayRaw === 'object'
      ? {
          ...shiftDayRaw,
          is_working_day:
            typeof shiftDayRaw.is_working_day === 'boolean'
              ? shiftDayRaw.is_working_day
              : Boolean(
                  shiftDayRaw.is_working_day ??
                    shiftDayRaw.isWorkingDay ??
                    shiftDayRaw.working_day ??
                    shiftDayRaw.workingDay,
                ),
        }
      : null

  // New contract fields
  const normalized = {
    open: Boolean(payload.open ?? payload.has_open_entry ?? false),
    open_reason: payload.open_reason ?? payload.reason ?? null,
    expected_next_out_at: payload.expected_next_out_at ?? payload.expectedNextOutAt ?? payload.expected_next_out ?? null,
    last_in_at: payload.last_in_at ?? payload.lastInAt ?? payload.last_in ?? null,
    shift_day: shiftDay,
    assignment_id: payload.assignment_id ?? payload.assignmentId ?? null,
    next_event: payload.next_event ?? payload.nextEvent ?? null,
    is_outside_shift: Boolean(payload.is_outside_shift ?? payload.outside_shift ?? false),
  }

  return normalized
}

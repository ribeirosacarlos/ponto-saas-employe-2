const firstDefined = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.trim() === '') continue
    return value
  }
  return null
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeEntriesList = (items) => (Array.isArray(items) ? items : [])

const getTimesheetDaySummarySource = (day = {}) =>
  firstDefined(
    day.summary,
    day.day_summary,
    day.daySummary,
    day.daily_summary,
    day.dailySummary,
    day.workday_summary,
    day.workdaySummary,
    day.totals,
    day,
  )

const getTimesheetDayDate = (day = {}) =>
  firstDefined(day.date, day.day, day.date_key, day.dateKey, day.work_date, day.workDate)

const getTimesheetDayEmployeeId = (day = {}) =>
  firstDefined(day.employee_id, day.employeeId, day.user_id, day.userId, day.user?.id, day.employee?.id)

const getEntryDateKey = (entry = {}) =>
  firstDefined(entry.work_date, entry.workDate, entry.date, entry.date_key, entry.dateKey)

const isGroupedEntriesDay = (item = {}) =>
  Boolean(
    item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      Array.isArray(item.entries) &&
      (getTimesheetDayDate(item) || getTimesheetDayEmployeeId(item)),
  )

const flattenGroupedEntriesDays = (items = []) =>
  items.flatMap((day) => {
    const userId = getTimesheetDayEmployeeId(day)
    const date = getTimesheetDayDate(day)
    const user = day.user ?? day.employee ?? null
    const daySummary = getTimesheetDaySummarySource(day)

    return normalizeEntriesList(day.entries).map((entry) => ({
      ...entry,
      user_id: firstDefined(entry.user_id, entry.userId, entry.employee_id, userId),
      user: entry.user ?? entry.employee ?? user,
      work_date: firstDefined(entry.work_date, entry.workDate, date),
      day_summary: firstDefined(entry.day_summary, entry.daySummary, daySummary),
    }))
  })

const buildDaysFromEntryList = (entries = []) => {
  const grouped = new Map()

  entries.forEach((entry, index) => {
    const date = getEntryDateKey(entry)
    if (!date) return

    const employeeId = firstDefined(
      entry.employee_id,
      entry.employeeId,
      entry.user_id,
      entry.userId,
      entry.user?.id,
      entry.employee?.id,
    )
    const key = `${employeeId ?? 'unknown'}::${date}`
    const current = grouped.get(key)
    const summarySource = firstDefined(
      entry.day_summary,
      entry.daySummary,
      entry.summary,
      entry.daily_summary,
      entry.dailySummary,
      entry.workday_summary,
      entry.workdaySummary,
    )

    if (current) {
      current.entries.push(entry)
      if (!current.user && (entry.user ?? entry.employee)) current.user = entry.user ?? entry.employee
      if (!current.summarySource && summarySource) current.summarySource = summarySource
      return
    }

    grouped.set(key, {
      date,
      employee_id: employeeId,
      user: entry.user ?? entry.employee ?? null,
      entries: [entry],
      summarySource,
      index,
    })
  })

  return Array.from(grouped.values()).map((day) => ({
    date: day.date,
    employee_id: day.employee_id,
    user: day.user,
    entries: day.entries,
    day_summary: day.summarySource,
  }))
}

const normalizeEntriesMeta = (metaSource = {}, payload = {}, { page, perPage } = {}) => ({
  currentPage:
    metaSource.current_page ?? metaSource.currentPage ?? payload?.current_page ?? metaSource.page ?? page,
  perPage: metaSource.per_page ?? metaSource.perPage ?? payload?.per_page ?? perPage,
  total:
    metaSource.total ??
    payload?.total ??
    metaSource.total_entries ??
    payload?.total_entries,
  totalEntries:
    metaSource.total_entries ??
    payload?.total_entries ??
    metaSource.total ??
    payload?.total,
  totalDays: metaSource.total_days ?? payload?.total_days,
  lastPage: metaSource.last_page ?? metaSource.lastPage ?? payload?.last_page,
})

export const normalizeTimesheetSummary = (source = {}) => {
  const payload =
    source?.summary && typeof source.summary === 'object' && !Array.isArray(source.summary)
      ? source.summary
      : source

  return {
    ...payload,
    workedMinutes: firstDefined(payload.worked_minutes, payload.workedMinutes),
    workedHhmm: firstDefined(payload.worked_hhmm, payload.workedHhmm),
    rawWorkedMinutes: firstDefined(payload.raw_worked_minutes, payload.rawWorkedMinutes),
    rawWorkedHhmm: firstDefined(payload.raw_worked_hhmm, payload.rawWorkedHhmm),
    expectedMinutes: firstDefined(payload.expected_minutes, payload.expectedMinutes),
    expectedHhmm: firstDefined(payload.expected_hhmm, payload.expectedHhmm),
    realBreakMinutes: firstDefined(payload.real_break_minutes, payload.realBreakMinutes),
    realBreakHhmm: firstDefined(payload.real_break_hhmm, payload.realBreakHhmm),
    allowedBreakMinutes: firstDefined(payload.allowed_break_minutes, payload.allowedBreakMinutes),
    allowedBreakHhmm: firstDefined(payload.allowed_break_hhmm, payload.allowedBreakHhmm),
    exceededBreakMinutes: firstDefined(payload.exceeded_break_minutes, payload.exceededBreakMinutes),
    exceededBreakHhmm: firstDefined(payload.exceeded_break_hhmm, payload.exceededBreakHhmm),
    balanceMinutes: firstDefined(payload.balance_minutes, payload.balanceMinutes),
    balanceHhmm: firstDefined(payload.balance_hhmm, payload.balanceHhmm),
    extraMinutes: firstDefined(payload.extra_minutes, payload.extraMinutes),
    extraHhmm: firstDefined(payload.extra_hhmm, payload.extraHhmm),
    debtMinutes: firstDefined(payload.debt_minutes, payload.debtMinutes),
    debtHhmm: firstDefined(payload.debt_hhmm, payload.debtHhmm),
    status: firstDefined(payload.status, payload.balance_status, payload.balanceStatus),
    isHoliday: Boolean(firstDefined(payload.is_holiday, payload.isHoliday, false)),
    holidayName: firstDefined(payload.holiday_name, payload.holidayName),
    isDayOff: Boolean(firstDefined(payload.is_day_off, payload.isDayOff, false)),
    isVacation: Boolean(firstDefined(payload.is_vacation, payload.isVacation, false)),
    isAbsence: Boolean(firstDefined(payload.is_absence, payload.isAbsence, false)),
    absenceType: firstDefined(payload.absence_type, payload.absenceType),
    hasIncompleteEntries: Boolean(
      firstDefined(payload.has_incomplete_entries, payload.hasIncompleteEntries, false),
    ),
    openSession: Boolean(firstDefined(payload.open_session, payload.openSession, false)),
    pairCount: firstDefined(payload.pair_count, payload.pairCount),
    pairDetails: Array.isArray(payload.pair_details)
      ? payload.pair_details
      : Array.isArray(payload.pairDetails)
        ? payload.pairDetails
        : [],
    openPair: firstDefined(payload.open_pair, payload.openPair),
  }
}

export const normalizeTimesheetDay = (day = {}, index = 0) => ({
  ...day,
  id: firstDefined(day.id, `${getTimesheetDayDate(day) ?? 'day'}-${index}`),
  date: getTimesheetDayDate(day),
  employeeId: getTimesheetDayEmployeeId(day),
  entries: normalizeEntriesList(day.entries),
  summary: normalizeTimesheetSummary(getTimesheetDaySummarySource(day)),
})

export const mergeTimesheetDays = (current = [], incoming = []) => {
  const byKey = new Map()

  ;[...current, ...incoming].forEach((rawDay, index) => {
    const day = normalizeTimesheetDay(rawDay, index)
    const key = `${day.employeeId ?? 'unknown'}::${day.date ?? `index-${index}`}`
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, day)
      return
    }

    const mergedEntries = [...(existing.entries || []), ...(day.entries || [])]
    const uniqueEntries = mergedEntries.filter((entry, entryIndex, list) => {
      const entryKey =
        entry?.id ??
        `${entry?.clocked_at ?? entry?.clockedAt ?? entry?.created_at ?? 'entry'}-${entry?.type ?? 'unknown'}`
      return (
        list.findIndex((candidate) => {
          const candidateKey =
            candidate?.id ??
            `${candidate?.clocked_at ?? candidate?.clockedAt ?? candidate?.created_at ?? 'entry'}-${candidate?.type ?? 'unknown'}`
          return String(candidateKey) === String(entryKey)
        }) === entryIndex
      )
    })

    byKey.set(key, {
      ...existing,
      ...day,
      entries: uniqueEntries,
      summary:
        day.summary && Object.keys(day.summary).length
          ? day.summary
          : existing.summary,
    })
  })

  return Array.from(byKey.values()).sort((left, right) =>
    String(right.date || '').localeCompare(String(left.date || '')),
  )
}

export const normalizeEntriesResponse = (data, { page, perPage }) => {
  const payload = data?.data && !Array.isArray(data.data) ? data.data : data
  const dataItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.entries)
        ? payload.entries
        : []
  const groupedDays = dataItems.filter((item) => isGroupedEntriesDay(item))
  const entries =
    groupedDays.length === dataItems.length && groupedDays.length
      ? flattenGroupedEntriesDays(groupedDays)
      : dataItems
  const daysSource = Array.isArray(payload?.days)
    ? payload.days
    : Array.isArray(data?.days)
      ? data.days
      : groupedDays.length === dataItems.length && groupedDays.length
        ? groupedDays
        : buildDaysFromEntryList(entries)
  const groupedByDay = groupedDays.length === dataItems.length && groupedDays.length > 0

  const metaSource = data?.meta || payload?.meta || payload || {}
  const meta = normalizeEntriesMeta(metaSource, payload, { page, perPage })

  return {
    data: entries,
    days: daysSource.map((day, index) => normalizeTimesheetDay(day, index)),
    meta,
    groupedByDay,
  }
}

export const normalizeWorkedToday = (payload = {}) => {
  const summary = normalizeTimesheetSummary(payload.summary ?? {})
  const details = payload.details && typeof payload.details === 'object' ? payload.details : {}

  return {
    ...payload,
    summary,
    workedMinutes: firstDefined(summary.workedMinutes, payload.worked_minutes, payload.workedMinutes),
    workedSeconds: firstDefined(payload.worked_seconds, payload.workedSeconds),
    expectedBreakMinutes: firstDefined(
      payload.expected_break_minutes,
      payload.expectedBreakMinutes,
      summary.allowedBreakMinutes,
    ),
    breakSecondsDeducted: firstDefined(payload.break_seconds_deducted, payload.breakSecondsDeducted),
    openSession: Boolean(firstDefined(payload.open_session, payload.openSession, summary.openSession, false)),
    details: {
      ...details,
      pairs: Array.isArray(details.pairs) ? details.pairs : [],
      entries: Array.isArray(details.entries) ? details.entries : [],
      open_pair: firstDefined(details.open_pair, details.openPair),
    },
  }
}

const getMinutesFromObject = (source) => {
  if (source === null || source === undefined) return null
  if (typeof source === 'number') return Number.isFinite(source) ? source : null
  if (typeof source === 'string') return toNumber(source)
  if (typeof source !== 'object') return null

  const summary = normalizeTimesheetSummary(source)
  return toNumber(
    firstDefined(
      summary.balanceMinutes,
      source.balanceMinutes,
      source.balance_minutes,
      source.totalMinutes,
      source.total_minutes,
      source.minutesBalance,
      source.minutes_balance,
      source.minutes,
    ),
  )
}

export const normalizeOvertimePayload = (payload = {}) => {
  const totals = normalizeTimesheetSummary(payload.totals ?? payload.summary ?? payload.balance ?? payload)
  const rawDays = Array.isArray(payload.days) ? payload.days : []
  const days = rawDays.map((day) => {
    const summary = normalizeTimesheetSummary(day)
    return {
      ...day,
      date: firstDefined(day.date, day.day),
      workedMinutes: firstDefined(summary.workedMinutes, day.worked_minutes, day.workedMinutes),
      workedHhmm: firstDefined(summary.workedHhmm, day.worked_hhmm, day.workedHhmm),
      expectedMinutes: firstDefined(summary.expectedMinutes, day.expected_minutes, day.expectedMinutes),
      expectedHhmm: firstDefined(summary.expectedHhmm, day.expected_hhmm, day.expectedHhmm),
      balanceMinutes: firstDefined(summary.balanceMinutes, day.balance_minutes, day.balanceMinutes),
      balanceHhmm: firstDefined(summary.balanceHhmm, day.balance_hhmm, day.balanceHhmm),
      extraMinutes: firstDefined(summary.extraMinutes, day.extra_minutes, day.extraMinutes),
      extraHhmm: firstDefined(summary.extraHhmm, day.extra_hhmm, day.extraHhmm),
      debtMinutes: firstDefined(summary.debtMinutes, day.debt_minutes, day.debtMinutes),
      debtHhmm: firstDefined(summary.debtHhmm, day.debt_hhmm, day.debtHhmm),
      rawWorkedMinutes: firstDefined(summary.rawWorkedMinutes, day.raw_worked_minutes, day.rawWorkedMinutes),
      rawWorkedHhmm: firstDefined(summary.rawWorkedHhmm, day.raw_worked_hhmm, day.rawWorkedHhmm),
      realBreakMinutes: firstDefined(summary.realBreakMinutes, day.real_break_minutes, day.realBreakMinutes),
      allowedBreakMinutes: firstDefined(summary.allowedBreakMinutes, day.allowed_break_minutes, day.allowedBreakMinutes),
      exceededBreakMinutes: firstDefined(summary.exceededBreakMinutes, day.exceeded_break_minutes, day.exceededBreakMinutes),
      status: firstDefined(summary.status, day.status),
      isHoliday: summary.isHoliday,
      holidayName: summary.holidayName,
      isDayOff: summary.isDayOff,
      isVacation: summary.isVacation,
      isAbsence: summary.isAbsence,
      absenceType: summary.absenceType,
      hasIncompleteEntries: summary.hasIncompleteEntries,
      summary,
    }
  })

  const balanceMinutes =
    getMinutesFromObject(totals) ??
    getMinutesFromObject(payload) ??
    (days.length
      ? days.reduce((sum, day) => sum + (toNumber(day.balanceMinutes) ?? 0), 0)
      : null)

  return {
    ...(typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    totals,
    days,
    balanceMinutes,
  }
}

export const getWorkedTodayMinutes = (payload) =>
  toNumber(firstDefined(payload?.summary?.workedMinutes, payload?.workedMinutes, payload?.worked_minutes)) ??
  (toNumber(firstDefined(payload?.workedSeconds, payload?.worked_seconds)) ?? 0) / 60

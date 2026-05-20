import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarRange,
  CalendarDays,
  Download,
  Filter,
  FileText,
  History as HistoryIcon,
  Monitor,
  Pencil,
  RefreshCcw,
  Smartphone,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/use-toast'
import { getEmployeeEntries } from '../services/modules/employee'
import { exportEntriesToCSV } from '../lib/exportEntries'
import { RequestAdjustmentButton } from '../components/RequestAdjustmentButton'
import { useAuthStore } from '../store/useAuth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PageContainer } from '../components/ui/PageContainer'
import { useDateTime } from '../hooks/useDateTime'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Input } from '../components/ui/input'
import { mergeTimesheetDays } from '../lib/timesheet'
import { cn } from '../lib/utils'
import { GroupedEntriesTable } from '../components/time-entries/GroupedEntriesTable'

const PAGE_SIZE = 20

const quickRanges = {
  lastMonth: () => {
    const today = new Date()
    const target = subMonths(today, 1)
    return {
      from: formatDateKey(startOfMonth(target)),
      to: formatDateKey(endOfMonth(target)),
    }
  },
  thisMonth: () => {
    const today = new Date()
    return {
      from: formatDateKey(startOfMonth(today)),
      to: formatDateKey(endOfMonth(today)),
    }
  },
  last7Days: () => {
    const today = new Date()
    return {
      from: formatDateKey(subDays(today, 6)),
      to: formatDateKey(today),
    }
  },
}

function formatDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function extractSourceDateKey(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  return formatDateKey(value)
}

function extractSourceTime(value) {
  if (typeof value !== 'string') return ''
  const match = value.match(/T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/i)
  return match ? `${match[1]}:${match[2]}` : ''
}

function formatDateParts(dateKey) {
  if (!dateKey || dateKey === 'unknown') return null
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return { year: match[1], month: match[2], day: match[3] }
}

function buildUtcDateFromKey(dateKey) {
  const parts = formatDateParts(dateKey)
  if (!parts) return null
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12, 0, 0))
}

function normalizeEntry(entry, t) {
  const clock = entry.clocked_at || entry.clockedAt || entry.date || entry.timestamp || entry.created_at

  return {
    ...entry,
    id: entry.id || entry.uuid || `${clock || 'entry'}-${Math.random().toString(36).slice(2)}`,
    clockedAt: clock,
    type: entry.type || entry.kind || entry.event_type || entry.status,
    status: entry.status || entry.state || entry.situation,
    notes: entry.notes || entry.observations || entry.reason || entry.comment || '',
    deviceType: entry.device_type || entry.deviceType || null,
    source: entry.source || entry.origin || entry.channel || t('common.sourceFallback'),
    badges: entry.badges || entry.flags || [],
  }
}

function formatDuration(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function calculateDayDuration(entries = [], alreadySorted = false) {
  const sorted = alreadySorted
    ? entries
    : [...entries].sort((a, b) => {
        const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return left - right
      })

  let totalMs = 0
  let lastIn = null

  sorted.forEach((entry) => {
    if (!entry.clockedAt) return
    const ts = new Date(entry.clockedAt).getTime()
    const type = entry.type
    if (type === 'in' || type === 'break_end') {
      lastIn = ts
    }
    if ((type === 'out' || type === 'break_start') && lastIn) {
      totalMs += ts - lastIn
      lastIn = null
    }
  })

  return Math.max(0, Math.round(totalMs / 60000))
}

function calculateBreakDuration(entries = []) {
  let totalMs = 0
  let breakStart = null
  const intervals = []

  entries.forEach((entry) => {
    if (!entry.clockedAt) return
    const ts = new Date(entry.clockedAt).getTime()
    const type = entry.type

    // Interval starts when user clocks out (leaves for lunch) and ends on the next clock-in.
    if (type === 'out' || type === 'break_start') {
      breakStart = { ts, raw: entry.clockedAt }
      return
    }

    if ((type === 'in' || type === 'break_end') && breakStart) {
      const duration = Math.max(0, ts - breakStart.ts)
      totalMs += duration
      intervals.push({ start: breakStart.raw, end: entry.clockedAt })
      breakStart = null
    }
  })

  const minutes = Math.max(0, Math.round(totalMs / 60000))
  return { minutes, hasBreak: minutes > 0, intervals }
}

function summarizeDay(entries = []) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
    const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
    return left - right
  })

  const entryRecord =
    sorted.find((entry) => entry.type === 'in' || entry.type === 'break_end') || sorted[0]
  const exitRecord =
    [...sorted]
      .reverse()
      .find((entry) => entry.type === 'out' || entry.type === 'break_start') || sorted[sorted.length - 1]

  const entryAt = entryRecord?.clockedAt || null
  const exitAt = exitRecord?.clockedAt || null
  const { minutes: breakMinutes, hasBreak, intervals: breakIntervals } = calculateBreakDuration(sorted)
  const workMinutes = calculateDayDuration(sorted, true)
  const entryTimestamp = entryAt ? new Date(entryAt).getTime() : null
  const exitTimestamp = exitAt ? new Date(exitAt).getTime() : null
  const spanMinutes =
    entryTimestamp !== null && exitTimestamp !== null
      ? Math.max(0, Math.round((exitTimestamp - entryTimestamp) / 60000))
      : null
  const idleMinutes = spanMinutes !== null ? Math.max(0, spanMinutes - workMinutes) : null

  return {
    entryAt,
    exitAt,
    breakMinutes,
    hasBreak,
    breakIntervals,
    workMinutes,
    idleMinutes,
  }
}

function formatEntryTypeLabel(type, t) {
  const normalized = String(type || '').trim().toLowerCase()

  switch (normalized) {
    case 'in':
      return t('historyPage.table.type.in', 'Entrada')
    case 'out':
      return t('historyPage.table.type.out', 'Saida')
    case 'break_start':
      return t('historyPage.table.type.breakStart', 'Inicio da pausa')
    case 'break_end':
      return t('historyPage.table.type.breakEnd', 'Fim da pausa')
    default:
      return normalized || t('historyPage.table.noType', 'Sem tipo')
  }
}

function getEntryTypeTone(type) {
  const normalized = String(type || '').trim().toLowerCase()

  switch (normalized) {
    case 'in':
    case 'break_end':
      return 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
    case 'out':
    case 'break_start':
      return 'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300'
    default:
      return 'border-border/70 bg-muted/60 text-muted-foreground'
  }
}

function getEntryOriginPresentation(entry, t) {
  const deviceType = String(entry.deviceType || '').trim().toLowerCase()
  const source = String(entry.source || '').trim().toLowerCase()

  if (deviceType === 'mobile') {
    return {
      icon: Smartphone,
      label: t('closeTimesheetPage.table.device.mobile', 'Mobile'),
    }
  }

  if (['adjustment', 'proposed_adjustment'].includes(source)) {
    return {
      icon: Pencil,
      label: t('historyPage.table.origin.adjustment', 'Adjustment'),
    }
  }

  return {
    icon: Monitor,
    label: t('closeTimesheetPage.table.device.web', 'Web'),
  }
}

export default function History({ onBackToDashboard }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const { formatDate, formatTime, tz, locale } = useDateTime()

  const formatTimeTz = useCallback(
    (value) => {
      const literalTime = extractSourceTime(value)
      if (literalTime) return literalTime
      const formatted = formatTime(value, { hour: '2-digit', minute: '2-digit', hour12: false })
      return formatted === '-' ? t('historyPage.labels.timeFallback') : formatted
    },
    [formatTime, t],
  )

  const weekdayFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale || 'pt-BR', { weekday: 'long', timeZone: 'UTC' })
    } catch (error) {
      return null
    }
  }, [locale])

  const formatWeekday = useCallback(
    (value) => {
      if (!value || !weekdayFormatter) return ''
      const dateKey = extractSourceDateKey(value)
      const date = buildUtcDateFromKey(dateKey)
      if (!date || Number.isNaN(date.getTime())) return ''
      const label = weekdayFormatter.format(date)
      if (!label) return ''
      const normalized = label.toLocaleLowerCase(locale || 'pt-BR')
      return normalized
        ? `${normalized.charAt(0).toLocaleUpperCase(locale || 'pt-BR')}${normalized.slice(1)}`
        : ''
    },
    [locale, weekdayFormatter],
  )

  const formatDateCell = useCallback(
    (value) => {
      if (!value) {
        return { date: t('historyPage.labels.unknownDate'), weekday: '' }
      }
      const dateKey = extractSourceDateKey(value)
      const parts = formatDateParts(dateKey)
      if (!parts) {
        return { date: t('historyPage.labels.unknownDate'), weekday: formatWeekday(value) }
      }
      const dateLabel = `${parts.day}/${parts.month}/${parts.year}`
      return {
        date: dateLabel || t('historyPage.labels.unknownDate'),
        weekday: formatWeekday(value),
      }
    },
    [formatWeekday, t],
  )

  const formatBreakRanges = useCallback(
    (intervals = []) => {
      if (!intervals.length) return t('historyPage.labels.timeFallback')
      const ranges = intervals.map((interval) => {
        const startLabel = formatTimeTz(interval.start)
        const endLabel = interval.end ? formatTimeTz(interval.end) : '--:--'
        return `${startLabel} - ${endLabel}`
      })
      return ranges.join(' · ')
    },
    [formatTimeTz, t],
  )

  const defaultRange = useMemo(() => quickRanges.lastMonth(), [])
  const [filters, setFilters] = useState(defaultRange)
  const [appliedFilters, setAppliedFilters] = useState(defaultRange)
  const [entries, setEntries] = useState([])
  const [days, setDays] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [localPage, setLocalPage] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const getGroupEntryAt = useCallback((group) => {
    const firstPair = group?.summary?.pairDetails?.[0]
    return firstPair?.in || group?.items?.[0]?.clockedAt || null
  }, [])

  const getGroupExitAt = useCallback((group) => {
    const pairs = group?.summary?.pairDetails || []
    const lastPair = [...pairs].reverse().find((pair) => pair?.out)
    return lastPair?.out || group?.items?.[group.items.length - 1]?.clockedAt || null
  }, [])

  const handleFetch = useCallback(
    async ({ page = 1, append = false, filters: filtersOverride } = {}) => {
      setError('')
      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const activeFilters = filtersOverride || appliedFilters
        const { data, days: responseDays, meta: responseMeta } = await getEmployeeEntries({
          from: activeFilters.from || undefined,
          to: activeFilters.to || undefined,
          page,
          perPage: PAGE_SIZE,
        })

        // Debug: inspect raw types from API to validate interval (break) detection.
        if (Array.isArray(data)) {
          const typeCounts = data.reduce((acc, item) => {
            const t = item?.type || item?.kind || item?.event_type || item?.status || 'unknown'
            acc[t] = (acc[t] || 0) + 1
            return acc
          }, {})
          // eslint-disable-next-line no-console
          console.log('[history] raw entry types', typeCounts)
        }

        const normalized = (data || []).map((item) => normalizeEntry(item, t))
        setEntries((prev) => (append ? [...prev, ...normalized] : normalized))
        setDays((prev) => (append ? mergeTimesheetDays(prev, responseDays || []) : responseDays || []))
        setMeta(responseMeta || null)
        setCurrentPage(responseMeta?.currentPage ?? page)
        if (!append) setLocalPage(1)
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          t('historyPage.states.errorDescription')
        setError(message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [appliedFilters.from, appliedFilters.to, t],
  )

  const supportsServerPagination = useMemo(() => {
    if (!meta) return false
    return Boolean(
      meta?.lastPage ||
        meta?.last_page ||
        meta?.total ||
        meta?.next_page_url ||
        meta?.per_page ||
        meta?.perPage,
    )
  }, [meta])

  useEffect(() => {
    handleFetch({ page: 1, filters: defaultRange })
  }, [defaultRange, handleFetch])

  const activeQuickRange = useMemo(() => {
    const lastMonth = quickRanges.lastMonth()
    if (filters.from === lastMonth.from && filters.to === lastMonth.to) return 'lastMonth'

    const thisMonth = quickRanges.thisMonth()
    if (filters.from === thisMonth.from && filters.to === thisMonth.to) return 'thisMonth'

    const last7Days = quickRanges.last7Days()
    if (filters.from === last7Days.from && filters.to === last7Days.to) return 'last7Days'

    return ''
  }, [filters.from, filters.to])

  const filteredEntries = useMemo(() => {
    const { from, to } = appliedFilters

    return entries
      .filter((entry) => {
        if (!entry.clockedAt) return true
        const key = extractSourceDateKey(entry.clockedAt)
        if (!key) return true
        if (from && key < from) return false
        if (to && key > to) return false
        return true
      })
      .sort((a, b) => {
        const leftTime = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const rightTime = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return rightTime - leftTime
      })
  }, [appliedFilters, entries])

  const filteredDays = useMemo(() => {
    const { from, to } = appliedFilters

    return (days || []).filter((day) => {
      const key = day?.date
      if (!key) return false
      if (from && key < from) return false
      if (to && key > to) return false
      return true
    })
  }, [appliedFilters, days])

  const paginatedEntries = useMemo(() => {
    if (supportsServerPagination) return filteredEntries
    return filteredEntries.slice(0, localPage * PAGE_SIZE)
  }, [filteredEntries, localPage, supportsServerPagination])

  const groupedEntries = useMemo(() => {
    const groups = paginatedEntries.reduce((acc, entry) => {
      const key = entry.clockedAt ? extractSourceDateKey(entry.clockedAt) || 'unknown' : 'unknown'
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})

    const fallbackGroups = Object.entries(groups).map(([dateKey, items]) => {
      const sortedItems = [...items].sort((a, b) => {
        const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return left - right
      })
      const summary = summarizeDay(sortedItems)
      return {
        dateKey,
        items: sortedItems,
        duration: summary.workMinutes,
        summary,
      }
    })

    if (!filteredDays.length) {
      return fallbackGroups.sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || ''))
    }

    const fallbackByDate = new Map(fallbackGroups.map((group) => [group.dateKey, group]))
    const daysBackedGroups = filteredDays.map((day) => {
      const fallbackGroup = fallbackByDate.get(day.date)
      const items = day.entries?.length
        ? day.entries.map((item) => normalizeEntry(item, t))
        : fallbackGroup?.items || []
      const sortedItems = [...items].sort((a, b) => {
        const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
        const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
        return left - right
      })

      return {
        dateKey: day.date,
        items: sortedItems,
        duration: Number(day.summary?.workedMinutes ?? 0),
        summary: day.summary,
      }
    })

    const daysWithSummary = new Set(daysBackedGroups.map((group) => group.dateKey))
    const orphanGroups = fallbackGroups.filter((group) => !daysWithSummary.has(group.dateKey))

    return [...daysBackedGroups, ...orphanGroups].sort((a, b) =>
      (b.dateKey || '').localeCompare(a.dateKey || ''),
    )
  }, [filteredDays, paginatedEntries, t])

  const hasMore = useMemo(() => {
    if (supportsServerPagination) {
      const total = meta?.total
      const lastPage = meta?.lastPage || meta?.last_page
      if (lastPage) return currentPage < lastPage
      if (total) return entries.length < total
      return Boolean(meta?.next_page_url || meta?.has_more)
    }
    return paginatedEntries.length < filteredEntries.length
  }, [currentPage, entries.length, filteredEntries.length, meta, paginatedEntries.length, supportsServerPagination])

  const handleLoadMore = async () => {
    if (supportsServerPagination) {
      const nextPage = (currentPage || 1) + 1
      await handleFetch({ page: nextPage, append: true })
      return
    }
    setLocalPage((prev) => prev + 1)
  }

  const handleApplyFilters = async () => {
    const nextFilters = { ...filters }
    setAppliedFilters(nextFilters)
    await handleFetch({ page: 1, filters: nextFilters })
  }

  const handleClearFilters = async () => {
    setFilters(defaultRange)
    setAppliedFilters(defaultRange)
    await handleFetch({ page: 1, filters: defaultRange })
  }

  const handleQuickRange = (key) => {
    const range = quickRanges[key]()
    setFilters(range)
  }

  const handleExport = () => {
    if (!paginatedEntries.length) {
      toast({
        title: t('historyPage.export.emptyTitle'),
        description: t('historyPage.export.emptyDescription'),
      })
      return
    }

    const fromLabel = appliedFilters.from || 'todos'
    const toLabel = appliedFilters.to || 'todos'
    const filename = `historial_marcaciones_${fromLabel}_${toLabel}.csv`
    exportEntriesToCSV(paginatedEntries, filename, { timeZone: tz, locale })

    toast({
      title: t('historyPage.export.successTitle'),
      description: t('historyPage.export.successDescription', { count: paginatedEntries.length }),
      variant: 'success',
    })
  }

const handleExportPDF = () => {
    if (!groupedEntries.length) {
      toast({
        title: t('historyPage.export.emptyTitle'),
        description: t('historyPage.export.emptyDescription'),
      })
      return
    }

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    })
    const getDateLabel = (value) => {
      if (!value) return t('historyPage.pdf.allDates')
      const parts = formatDateParts(extractSourceDateKey(value))
      return parts ? `${parts.day}/${parts.month}/${parts.year}` : t('historyPage.pdf.allDates')
    }

    const periodRange = `${getDateLabel(appliedFilters.from)} - ${getDateLabel(appliedFilters.to)}`

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(t('historyPage.pdf.title'), 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(t('historyPage.pdf.periodLabel', { range: periodRange }), 14, 28)
    doc.setFontSize(11)
    doc.text(t('historyPage.pdf.employerData'), 14, 36)
    doc.setFontSize(10)
    const collaboratorName = user?.name || t('historyPage.pdf.notAvailable')
    const collaboratorEmail = user?.email || t('historyPage.pdf.notAvailable')
    const collaboratorCpf = user?.cpf || t('historyPage.pdf.notAvailable')
    doc.text(`${t('historyPage.pdf.labels.name')}: ${collaboratorName}`, 14, 44)
    doc.text(`${t('historyPage.pdf.labels.email')}: ${collaboratorEmail}`, 110, 44)
    doc.text(t('historyPage.pdf.collaboratorData'), 14, 54)
    doc.text(`${t('historyPage.pdf.labels.cpf')}: ${collaboratorCpf}`, 14, 60)
    doc.text(`${t('historyPage.pdf.labels.employer')}: ${t('historyPage.pdf.notAvailable')}`, 110, 60)

    const body = groupedEntries.map((group) => {
      const { summary } = group
      const entryAt = getGroupEntryAt(group)
      const exitAt = getGroupExitAt(group)
      const entryLabel = entryAt ? formatTimeTz(entryAt) : t('historyPage.labels.timeFallback')
      const exitLabel = exitAt ? formatTimeTz(exitAt) : t('historyPage.labels.timeFallback')
      const intervalLabel =
        summary?.realBreakHhmm ||
        (summary?.hasBreak ? formatBreakRanges(summary.breakIntervals) : t('historyPage.labels.timeFallback'))
      const workedLabel =
        summary?.workedHhmm ||
        (group.duration ? formatDuration(group.duration) : t('historyPage.labels.noDuration'))
      const balanceLabel =
        summary?.balanceHhmm ||
        (typeof summary?.idleMinutes === 'number'
          ? formatDuration(summary.idleMinutes)
          : t('historyPage.labels.timeFallback'))

      return [
        formatDateLabel(group.dateKey),
        entryLabel,
        intervalLabel,
        exitLabel,
        workedLabel,
        balanceLabel,
      ]
    })

    const totalWorkedMinutes = groupedEntries.reduce(
      (sum, group) => sum + Number(group.summary?.workedMinutes ?? group.duration ?? 0),
      0,
    )
    const totalBalanceMinutes = groupedEntries.reduce(
      (sum, group) => sum + Number(group.summary?.balanceMinutes ?? 0),
      0,
    )

    autoTable(doc, {
      startY: 72,
      head: [
        [
          t('historyPage.table.headers.date'),
          t('historyPage.table.headers.entry'),
          t('historyPage.table.headers.break', 'Pausa'),
          t('historyPage.table.headers.exit'),
          t('historyPage.table.headers.worked'),
          t('historyPage.table.headers.balance', 'Saldo'),
        ],
      ],
      body,
      foot: [
        [
          t('historyPage.pdf.totalLabel'),
          '',
          '',
          '',
          formatDuration(totalWorkedMinutes),
          totalBalanceMinutes >= 0
            ? `+${formatDuration(totalBalanceMinutes)}`
            : `-${formatDuration(Math.abs(totalBalanceMinutes))}`,
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: '#f2f2f2' },
      theme: 'grid',
    })

    doc.save('folha-de-ponto.pdf')
  }

  const formatDateLabel = (dateKey) => {
    if (dateKey === 'unknown') return t('historyPage.labels.unknownDate')
    const date = buildUtcDateFromKey(dateKey)
    if (!date) return t('historyPage.labels.unknownDate')
    const label = formatDate(date, {
      timeZone: 'UTC',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  return (
    <div className="relative min-h-screen bg-transparent text-foreground transition-colors duration-300">

      <PageContainer className="relative z-10 py-6 lg:py-8">
        <AppTopBar
          icon={<HistoryIcon className="h-5 w-5" />}
          eyebrow={t('historyPage.badge')}
          title={t('historyPage.title')}
          subtitle={t('historyPage.subtitle')}
          actions={
            <>
              <RequestAdjustmentButton
                entries={entries}
                variant="outline"
                className="w-full rounded-full border-border bg-background/80 px-3 text-sm sm:w-auto"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-border bg-background/80 px-3 text-sm sm:w-auto"
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4 text-primary" />
                {t('historyPage.export.label')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-border bg-background/80 px-3 text-sm sm:w-auto"
                onClick={handleExportPDF}
              >
                <FileText className="mr-2 h-4 w-4 text-primary" />
                {t('historyPage.export.pdfLabel')}
              </Button>
            </>
          }
        />

        <div className="mt-5 min-w-0">
          <section className="space-y-4 min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                  />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 shadow-[0_18px_50px_-38px_rgba(255,82,82,0.25)] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 space-y-2">
                  <p className="font-semibold break-words text-balance">
                    {t('historyPage.states.errorTitle')}
                  </p>
                  <p className="break-words">{error}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full rounded-full px-3 text-xs sm:w-auto"
                    onClick={() => handleFetch({ page: 1 })}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('historyPage.states.retry')}
                  </Button>
                </div>
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="min-w-0 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight break-words text-balance">
                        {t('historyPage.table.title')}
                      </p>
                      <p className="text-xs text-muted-foreground break-words text-balance">
                        {t('historyPage.table.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    <span className="max-w-full rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-center text-[11px] font-semibold tracking-[0.14em] text-primary break-words text-balance">
                      {t('historyPage.labels.totalEntries', { count: paginatedEntries.length })}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 text-xs"
                        onClick={handleClearFilters}
                        disabled={loading}
                      >
                        {t('historyPage.filters.clear')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/60 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>{t('historyPage.filters.title')}</span>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] xl:items-end">
                    <div className="space-y-1.5">
                      <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1 sm:flex-nowrap">
                        {([
                          ['lastMonth', t('historyPage.filters.quick.lastMonth')],
                          ['thisMonth', t('historyPage.filters.quick.thisMonth')],
                          ['last7Days', t('historyPage.filters.quick.last7Days')],
                        ]).map(([key, label]) => (
                          <Button
                            key={key}
                            type="button"
                            size="sm"
                            variant={activeQuickRange === key ? 'default' : 'ghost'}
                            className="h-7 flex-1 rounded-md px-2 text-[11px]"
                            onClick={() => handleQuickRange(key)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t('historyPage.filters.from')}
                        </span>
                        <div className="relative min-w-0">
                          <Input
                            type="date"
                            value={filters.from}
                            max={filters.to || undefined}
                            onChange={(event) =>
                              setFilters((prev) => ({ ...prev, from: event.target.value }))
                            }
                            className="h-8 rounded-md pr-8 text-[11px]"
                          />
                          <CalendarRange className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t('historyPage.filters.to')}
                        </span>
                        <div className="relative min-w-0">
                          <Input
                            type="date"
                            value={filters.to}
                            min={filters.from || undefined}
                            onChange={(event) =>
                              setFilters((prev) => ({ ...prev, to: event.target.value }))
                            }
                            className="h-8 rounded-md pr-8 text-[11px]"
                          />
                          <CalendarRange className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-md px-3 text-[11px]"
                        onClick={handleApplyFilters}
                        disabled={loading || !filters.from || !filters.to}
                      >
                        {t('historyPage.filters.apply')}
                      </Button>
                    </div>
                  </div>
                </div>

                {groupedEntries.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground shadow-[0_18px_50px_-40px_rgba(62,82,152,0.35)]">
                    <p className="font-semibold text-foreground break-words text-balance">
                      {t('historyPage.states.emptyTitle')}
                    </p>
                    <p className="mt-1 break-words text-balance">
                      {t('historyPage.states.emptyDescription')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full rounded-full px-4 sm:w-auto"
                        onClick={handleClearFilters}
                      >
                        {t('historyPage.filters.clear')}
                      </Button>
                      {onBackToDashboard ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full rounded-full px-4 sm:w-auto"
                          onClick={onBackToDashboard}
                        >
                          {t('historyPage.actions.back')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <GroupedEntriesTable
                      groups={groupedEntries}
                      minWidthClassName="min-w-[920px]"
                      getGroupLabel={(group) => formatDateLabel(group.dateKey)}
                      getGroupCountLabel={(_group, count) => `${count} ${t('historyPage.table.records', 'registros')}`}
                      getGroupMeta={(group) => {
                        const workedLabel =
                          group.summary?.workedHhmm ||
                          (group.duration
                            ? formatDuration(group.duration)
                            : t('historyPage.labels.noDuration'))

                        return (
                          <div className="flex flex-wrap items-center justify-end gap-3 text-[11px]">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-muted-foreground/70">
                                {t('historyPage.table.headers.worked')}
                              </span>
                              <span className="font-mono font-semibold text-foreground">{workedLabel}</span>
                            </span>
                          </div>
                        )
                      }}
                      columns={[
                        {
                          key: 'date',
                          header: t('historyPage.table.headers.date'),
                          headerClassName: 'w-[150px] text-center',
                          cellClassName: 'text-center',
                          renderCell: (_entry, group) => {
                            const dateCell = formatDateCell(group.dateKey)
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <p className="font-semibold break-words text-balance">
                                  {dateCell.date}
                                </p>
                                {dateCell.weekday ? (
                                  <p className="text-[11px] text-muted-foreground break-words">
                                    {dateCell.weekday}
                                  </p>
                                ) : null}
                              </div>
                            )
                          },
                        },
                        {
                          key: 'time',
                          header: t('historyPage.table.headers.entry'),
                          headerClassName: 'w-[110px] text-center',
                          cellClassName: 'text-center',
                          renderCell: (entry) => (
                            <span className="font-medium text-foreground">
                              {entry.clockedAt
                                ? formatTimeTz(entry.clockedAt)
                                : t('historyPage.labels.timeFallback')}
                            </span>
                          ),
                        },
                        {
                          key: 'type',
                          header: t('historyPage.table.headers.type', 'Tipo'),
                          headerClassName: 'w-[150px] text-center',
                          cellClassName: 'text-center',
                          renderCell: (entry) => (
                            <span
                              className={cn(
                                'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none',
                                getEntryTypeTone(entry.type),
                              )}
                            >
                              {formatEntryTypeLabel(entry.type, t)}
                            </span>
                          ),
                        },
                        {
                          key: 'origin',
                          header: t('historyPage.table.headers.source', 'Origem'),
                          headerClassName: 'w-[120px] text-center',
                          cellClassName: 'text-center',
                          renderCell: (entry) => {
                            const origin = getEntryOriginPresentation(entry, t)
                            const Icon = origin.icon

                            return (
                              <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {origin.label}
                              </span>
                            )
                          },
                        },
                        {
                          key: 'notes',
                          header: t('historyPage.table.headers.notes', 'Observacoes'),
                          headerClassName: 'w-[220px] text-center',
                          cellClassName: 'text-center',
                          renderCell: (entry) => (
                            <div className="mx-auto max-w-[220px]">
                              <span className="block truncate text-foreground/90" title={entry.notes || ''}>
                                {entry.notes || t('historyPage.table.noNotes', '—')}
                              </span>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            ) : null}
            {!loading && !error && hasMore ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full px-4 sm:w-auto"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('historyPage.actions.loadingMore') : t('historyPage.actions.loadMore')}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </PageContainer>
    </div>
  )
}

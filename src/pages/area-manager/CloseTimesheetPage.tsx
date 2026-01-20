import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  endOfDay,
  endOfMonth,
  format,
  formatISO,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarClock,
  CalendarRange,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  RefreshCcw,
  Search,
  Timer,
  UserRound,
} from 'lucide-react'
import autoTable from 'jspdf-autotable'
import { jsPDF } from 'jspdf'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import { PageContainer } from '../../components/ui/PageContainer'
import { useToast } from '../../components/ui/use-toast'
import { listEmployees } from '../../services/modules/employees'
import { listTeamEntries } from '../../services/adminAdjustmentsService'
import { cn } from '../../lib/utils'
import { downloadBlob } from '../../utils/pdf/downloadBlob'

const PAGE_SIZE = 30

const getLastMonthRange = () => {
  const today = new Date()
  const start = startOfMonth(subMonths(today, 1))
  const end = endOfMonth(subMonths(today, 1))
  return {
    from: format(start, 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  }
}

const quickRanges = {
  lastMonth: getLastMonthRange,
  thisMonth: () => {
    const today = new Date()
    return {
      from: format(startOfMonth(today), 'yyyy-MM-dd'),
      to: format(endOfMonth(today), 'yyyy-MM-dd'),
    }
  },
  last30Days: () => {
    const today = new Date()
    const start = startOfDay(subDays(today, 29))
    const end = endOfDay(today)
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    }
  },
}

const formatMinutes = (minutes?: number) => {
  const total = Number.isFinite(minutes) ? Number(minutes) : 0
  const hours = String(Math.floor(total / 60)).padStart(2, '0')
  const mins = String(Math.max(0, Math.round(total % 60))).padStart(2, '0')
  return `${hours}:${mins}`
}

const normalizeEntry = (entry: any = {}, index = 0) => {
  const clock = entry.clocked_at ?? entry.clockedAt ?? entry.date ?? entry.timestamp ?? ''
  return {
    ...entry,
    id: entry.id ?? entry.uuid ?? entry.entry_id ?? `timesheet-entry-${index}`,
    clockedAt: clock,
    type: entry.type ?? entry.event_type ?? entry.kind ?? '',
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null,
    source: entry.source ?? entry.origin ?? '',
    user: entry.user ?? entry.employee ?? null,
  }
}

const normalizeEmployee = (employee: any = {}, index = 0) => ({
  id:
    employee.id ??
    employee.uuid ??
    employee.user_id ??
    employee.employee_id ??
    employee.email ??
    `employee-${index}`,
  name: employee.name ?? employee.full_name ?? employee.fullName ?? '',
  email: employee.email ?? '',
})

const buildTimesheetSummary = (entries = []) => {
  const duplicateMap = new Map()
  const pendingIds = new Set()
  let totalMinutes = 0

  const groups = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const clock = entry.clockedAt
    if (clock) {
      const clockKey = new Date(clock).toISOString()
      const count = duplicateMap.get(clockKey) || 0
      duplicateMap.set(clockKey, count + 1)
    }

    const dateKey = clock ? format(new Date(clock), 'yyyy-MM-dd') : 'unknown'
    acc[dateKey] = acc[dateKey] ? [...acc[dateKey], entry] : [entry]
    return acc
  }, {})

  Object.entries(groups).forEach(([, dayEntries]) => {
    const sorted = [...dayEntries].sort((a, b) => {
      const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
      const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
      return left - right
    })

    const openIns: any[] = []
    sorted.forEach((entry) => {
      if (!entry.clockedAt) return
      const ts = new Date(entry.clockedAt).getTime()
      if (!Number.isFinite(ts)) return
      if (entry.type === 'in') {
        openIns.push({ id: entry.id, ts })
        return
      }
      if (entry.type === 'out' && openIns.length) {
        const start = openIns.shift()
        totalMinutes += Math.max(0, Math.round((ts - start.ts) / 60000))
      }
    })

    openIns.forEach((item) => pendingIds.add(item.id))
  })

  const duplicateCount = Array.from(duplicateMap.values()).reduce((acc, count) => {
    if (count > 1) return acc + (count - 1)
    return acc
  }, 0)

  const dayKeys = Object.keys(groups).filter((key) => key !== 'unknown')

  return {
    totalEntries: entries.length,
    daysWithRecords: dayKeys.length,
    totalMinutes,
    pendingCount: pendingIds.size,
    duplicateCount,
    pendingIds,
    duplicateMap,
  }
}

export default function CloseTimesheetPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  const defaultRange = useMemo(() => getLastMonthRange(), [])
  const [employees, setEmployees] = useState<any[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [filters, setFilters] = useState({
    employeeId: '',
    from: defaultRange.from,
    to: defaultRange.to,
  })
  const [appliedFilters, setAppliedFilters] = useState({
    employeeId: '',
    from: defaultRange.from,
    to: defaultRange.to,
  })

  const [entries, setEntries] = useState<any[]>([])
  const [meta, setMeta] = useState<any | null>(null)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [entriesError, setEntriesError] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<'standard' | 'detailed' | ''>('')
  const [locationEntry, setLocationEntry] = useState<any | null>(null)

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(employeeSearch.trim())
    }, 250)
    return () => window.clearTimeout(handler)
  }, [employeeSearch])

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    setEmployeesError('')
    try {
      const response = await listEmployees(1, { perPage: 200 })
      const items = (response?.data || response || []).map((item: any, index: number) =>
        normalizeEmployee(item, index),
      )
      setEmployees(items)
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('closeTimesheetPage.states.employeesError')
      setEmployeesError(message)
      toast({
        title: t('closeTimesheetPage.states.employeesErrorTitle'),
        description: message,
        variant: 'error',
      })
    } finally {
      setEmployeesLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === filters.employeeId) || null,
    [employees, filters.employeeId],
  )

  const filteredEmployees = useMemo(() => {
    if (!debouncedSearch) return employees
    const query = debouncedSearch.toLowerCase()
    return employees.filter((emp) => {
      const target = `${emp.name || ''} ${emp.email || ''}`.toLowerCase()
      return target.includes(query)
    })
  }, [debouncedSearch, employees])

  const canSearch =
    Boolean(filters.employeeId) &&
    Boolean(filters.from) &&
    Boolean(filters.to) &&
    !isAfter(parseISO(filters.from), parseISO(filters.to))

  const normalizedEntries = useMemo(
    () => entries.map((entry, index) => normalizeEntry(entry, index)),
    [entries],
  )
  const summary = useMemo(() => buildTimesheetSummary(normalizedEntries), [normalizedEntries])

  const duplicatesSet = useMemo(() => {
    const set = new Set()
    summary.duplicateMap?.forEach((count, key) => {
      if (count > 1) set.add(key)
    })
    return set
  }, [summary.duplicateMap])

  const groupedEntries = useMemo(() => {
    const groups = normalizedEntries.reduce<Record<string, any[]>>((acc, entry) => {
      const dateKey = entry.clockedAt ? format(new Date(entry.clockedAt), 'yyyy-MM-dd') : 'unknown'
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], entry] : [entry]
      return acc
    }, {})

    return Object.entries(groups)
      .map(([dateKey, items]) => ({
        dateKey,
        items: [...items].sort((a, b) => {
          const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
          const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
          return right - left
        }),
      }))
      .sort((a, b) => {
        const left = new Date(a.dateKey).getTime()
        const right = new Date(b.dateKey).getTime()
        return (isNaN(right) ? 0 : right) - (isNaN(left) ? 0 : left)
      })
  }, [normalizedEntries])

  const formatClock = useCallback(
    (value?: string) => {
      if (!value) return t('closeTimesheetPage.table.noTime')
      const date = new Date(value)
      if (!isValid(date)) return value
      return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
    },
    [i18n.language, t],
  )

  const formatDateLabel = useCallback(
    (value?: string) => {
      if (!value || value === 'unknown') return t('closeTimesheetPage.table.unknownDate')
      const date = parseISO(value)
      if (!isValid(date)) return value
      return date.toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      })
    },
    [i18n.language, t],
  )

  const handleQuickRange = (key: keyof typeof quickRanges) => {
    const range = quickRanges[key]()
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to }))
  }

  const handleSearch = useCallback(
    async (pageToLoad = 1) => {
      if (!canSearch) return
      setLoadingEntries(true)
      setEntriesError('')
      try {
        const { from, to, employeeId } = filters
        const params = {
          userId: employeeId,
          dateFrom: formatISO(startOfDay(parseISO(from))),
          dateTo: formatISO(endOfDay(parseISO(to))),
          page: pageToLoad,
          perPage: PAGE_SIZE,
        }

        const { data, meta: responseMeta } = await listTeamEntries(params)
        setEntries(data || [])
        setMeta(responseMeta || null)
        setPage(responseMeta?.currentPage || pageToLoad || 1)
        setAppliedFilters(filters)
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.userFriendlyMessage ||
          error?.message ||
          t('closeTimesheetPage.states.entriesError')
        setEntriesError(message)
        setEntries([])
        toast({
          title: t('closeTimesheetPage.states.entriesErrorTitle'),
          description: message,
          variant: 'error',
        })
      } finally {
        setLoadingEntries(false)
      }
    },
    [canSearch, filters, t, toast],
  )

  const handlePaginate = async (direction: 'prev' | 'next') => {
    const nextPage = direction === 'next' ? (page || 1) + 1 : Math.max(1, (page || 1) - 1)
    await handleSearch(nextPage)
  }

  const buildFilename = (suffix = 'folha-ponto') => {
    const name =
      selectedEmployee?.name?.trim().toLowerCase().replace(/\s+/g, '-') ||
      selectedEmployee?.email?.split('@')[0] ||
      'funcionario'
    const fromLabel = appliedFilters.from || filters.from
    const toLabel = appliedFilters.to || filters.to
    return `${suffix}_${name}_${fromLabel}_a_${toLabel}.pdf`
  }

  const ensureEntriesBeforeExport = (variant: 'standard' | 'detailed') => {
    if (!normalizedEntries.length) {
      toast({
        title: t('closeTimesheetPage.export.emptyTitle'),
        description: t('closeTimesheetPage.export.emptyDescription'),
      })
      return false
    }
    setExporting(variant)
    return true
  }

  const addPaginationFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages()
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      doc.setPage(pageIndex)
      doc.setFontSize(9)
      doc.text(
        t('closeTimesheetPage.export.pageCounter', { current: pageIndex, total: pageCount }),
        doc.internal.pageSize.getWidth() - 28,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' },
      )
    }
  }

  const exportPdf = (detailed = false) => {
    if (!ensureEntriesBeforeExport(detailed ? 'detailed' : 'standard')) return
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const employeeLabel =
        selectedEmployee?.name || selectedEmployee?.email || t('closeTimesheetPage.table.userFallback')
      const periodLabel = `${formatDateLabel(appliedFilters.from)} - ${formatDateLabel(appliedFilters.to)}`
      const issuedAt = new Date()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(t('closeTimesheetPage.export.title'), 14, 18)

      doc.setFontSize(11)
      doc.text(t('closeTimesheetPage.export.company'), 14, 28)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`${t('closeTimesheetPage.export.employee')}: ${employeeLabel}`, 14, 36)
      doc.text(`${t('closeTimesheetPage.export.period')}: ${periodLabel}`, 14, 42)
      doc.text(
        `${t('closeTimesheetPage.export.issuedAt')}: ${issuedAt.toLocaleString(i18n.language)}`,
        14,
        48,
      )

      autoTable(doc, {
        startY: 55,
        head: [[t('closeTimesheetPage.summary.title'), t('closeTimesheetPage.summary.value')]],
        body: [
          [t('closeTimesheetPage.summary.entries'), String(summary.totalEntries)],
          [t('closeTimesheetPage.summary.days'), String(summary.daysWithRecords)],
          [t('closeTimesheetPage.summary.hours'), formatMinutes(summary.totalMinutes)],
          [t('closeTimesheetPage.summary.pending'), String(summary.pendingCount)],
          [t('closeTimesheetPage.summary.duplicates'), String(summary.duplicateCount)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: '#f6f8fb' },
        theme: 'striped',
      })

      let startY = (doc.lastAutoTable?.finalY || 64) + 8
      groupedEntries.forEach((group) => {
        const dateLabel = formatDateLabel(group.dateKey)
        if (startY + 30 > doc.internal.pageSize.getHeight()) {
          doc.addPage()
          startY = 20
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(dateLabel, 14, startY)
        doc.setFont('helvetica', 'normal')

        const body = group.items.map((entry) => {
          const timeLabel = formatClock(entry.clockedAt)
          const typeLabel = (entry.type || '').toUpperCase()
          const statusLabel = summary.pendingIds.has(entry.id)
            ? t('closeTimesheetPage.table.status.pending')
            : duplicatesSet.has(entry.clockedAt ? new Date(entry.clockedAt).toISOString() : '')
              ? t('closeTimesheetPage.table.status.duplicate')
              : t('closeTimesheetPage.table.status.ok')

          const baseRow = [timeLabel, typeLabel, entry.source || '-', statusLabel]

          if (!detailed) return baseRow
          return [...baseRow, entry.latitude && entry.longitude ? `${entry.latitude}, ${entry.longitude}` : '—']
        })

        autoTable(doc, {
          startY: startY + 4,
          head: [
            detailed
              ? [
                  t('closeTimesheetPage.table.headers.time'),
                  t('closeTimesheetPage.table.headers.type'),
                  t('closeTimesheetPage.table.headers.source'),
                  t('closeTimesheetPage.table.headers.status'),
                  t('closeTimesheetPage.table.headers.location'),
                ]
              : [
                  t('closeTimesheetPage.table.headers.time'),
                  t('closeTimesheetPage.table.headers.type'),
                  t('closeTimesheetPage.table.headers.source'),
                  t('closeTimesheetPage.table.headers.status'),
                ],
          ],
          body,
          styles: { fontSize: 9 },
          headStyles: { fillColor: '#eef2ff' },
          theme: 'grid',
        })

        startY = (doc.lastAutoTable?.finalY || startY + 20) + 10
      })

      addPaginationFooter(doc)

      const blob = doc.output('blob')
      downloadBlob({
        blob,
        fallbackFilename: buildFilename(detailed ? 'folha-ponto_detalhado' : 'folha-ponto'),
      })

      toast({
        title: t('closeTimesheetPage.export.successTitle'),
        description: t('closeTimesheetPage.export.successDescription'),
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: t('closeTimesheetPage.export.errorTitle'),
        description: error?.message || t('closeTimesheetPage.export.errorDescription'),
        variant: 'error',
      })
    } finally {
      setExporting('')
    }
  }

  const currentPage = meta?.currentPage || page || 1
  const lastPage = meta?.lastPage || meta?.last_page || null
  const total = meta?.total
  const canGoNext = lastPage ? currentPage < lastPage : total ? currentPage * PAGE_SIZE < total : true
  const hasSearched = Boolean(appliedFilters.employeeId)

  return (
    <div className="relative min-h-screen">
      <PageContainer className="pb-16 pt-8 lg:pt-10">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-card/85 px-4 py-4 shadow-[0_28px_80px_-48px_rgba(62,82,152,0.55)] backdrop-blur-xl sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner shadow-primary/15">
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t('closeTimesheetPage.badge')}
                  </span>
                  <span className="rounded-full border border-emerald-200/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200">
                    {t('closeTimesheetPage.defaultRange')}
                  </span>
                </div>
                <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
                  {t('closeTimesheetPage.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('closeTimesheetPage.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <span>
                {t('closeTimesheetPage.labels.period')}: {formatDateLabel(filters.from)} -{' '}
                {formatDateLabel(filters.to)}
              </span>
            </div>
          </header>

          <Card className="border-dashed">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{t('closeTimesheetPage.filters.title')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange('lastMonth')}
                >
                  {t('closeTimesheetPage.filters.quick.lastMonth')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange('thisMonth')}
                >
                  {t('closeTimesheetPage.filters.quick.thisMonth')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange('last30Days')}
                >
                  {t('closeTimesheetPage.filters.quick.last30Days')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('closeTimesheetPage.filters.employee')}
                  </label>
                  <div className="flex flex-col gap-2 rounded-[18px] border border-border/70 bg-background/80 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={employeeSearch}
                          onChange={(event) => setEmployeeSearch(event.target.value)}
                          placeholder={t('closeTimesheetPage.filters.searchPlaceholder')}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 space-y-2 overflow-auto pr-1">
                      {employeesLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((item) => (
                            <div
                              key={item}
                              className="h-10 w-full animate-pulse rounded-lg bg-muted/70"
                            />
                          ))}
                        </div>
                      ) : employeesError ? (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-500/10 px-3 py-2 text-amber-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{employeesError}</span>
                        </div>
                      ) : filteredEmployees.length ? (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                employeeId: emp.id,
                              }))
                            }
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                              emp.id === filters.employeeId
                                ? 'border-primary/60 bg-primary/10 text-primary'
                                : 'border-border/70 hover:border-primary/30 hover:bg-muted/60',
                            )}
                          >
                            <UserRound className="h-4 w-4 shrink-0" />
                            <div className="flex flex-1 flex-col">
                              <span className="text-sm font-medium">{emp.name || emp.email}</span>
                              <span className="text-xs text-muted-foreground">{emp.email}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t('closeTimesheetPage.filters.empty')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[18px] border border-border/70 bg-background/80 p-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      {t('closeTimesheetPage.filters.from')}
                    </label>
                    <Input
                      type="date"
                      value={filters.from}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, from: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      {t('closeTimesheetPage.filters.to')}
                    </label>
                    <Input
                      type="date"
                      value={filters.to}
                      min={filters.from}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, to: event.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-sm text-muted-foreground">
                      {t('closeTimesheetPage.filters.hint')}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFilters({
                            employeeId: '',
                            from: defaultRange.from,
                            to: defaultRange.to,
                          })
                        }
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {t('closeTimesheetPage.filters.reset')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSearch(1)}
                        disabled={!canSearch || loadingEntries}
                      >
                        {loadingEntries ? (
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="mr-2 h-4 w-4" />
                        )}
                        {t('closeTimesheetPage.filters.submit')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasSearched ? (
            <div className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardContent className="space-y-1 py-5">
                  <p className="text-sm text-muted-foreground">
                    {t('closeTimesheetPage.summary.entries')}
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-semibold">{summary.totalEntries}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 py-5">
                  <p className="text-sm text-muted-foreground">{t('closeTimesheetPage.summary.days')}</p>
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-semibold">{summary.daysWithRecords}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 py-5">
                  <p className="text-sm text-muted-foreground">
                    {t('closeTimesheetPage.summary.hours')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-semibold">{formatMinutes(summary.totalMinutes)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 py-5">
                  <p className="text-sm text-muted-foreground">
                    {t('closeTimesheetPage.summary.inconsistencies')}
                  </p>
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <div className="text-sm">
                      <div>{t('closeTimesheetPage.summary.pendingCount', { count: summary.pendingCount })}</div>
                      <div>{t('closeTimesheetPage.summary.duplicateCount', { count: summary.duplicateCount })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  {t('closeTimesheetPage.table.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('closeTimesheetPage.table.subtitle')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting === 'standard' || !normalizedEntries.length}
                  onClick={() => exportPdf(false)}
                >
                  {exporting === 'standard' ? (
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t('closeTimesheetPage.export.primary')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={exporting === 'detailed' || !normalizedEntries.length}
                  onClick={() => exportPdf(true)}
                >
                  {exporting === 'detailed' ? (
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {t('closeTimesheetPage.export.detailed')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingEntries ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 w-full animate-pulse rounded-xl bg-muted/70" />
                  ))}
                </div>
              ) : entriesError ? (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200/70 bg-rose-500/10 px-4 py-3 text-rose-700">
                  <AlertCircle className="h-5 w-5" />
                  <div className="space-y-1">
                    <p className="font-medium">{t('closeTimesheetPage.states.entriesErrorTitle')}</p>
                    <p className="text-sm">{entriesError}</p>
                  </div>
                </div>
              ) : hasSearched && groupedEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-8 text-center text-muted-foreground">
                  {t('closeTimesheetPage.states.empty')}
                </div>
              ) : !hasSearched ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-center text-muted-foreground">
                  {t('closeTimesheetPage.states.waitingEmployee')}
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedEntries.map((group) => (
                    <div key={group.dateKey} className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <CalendarRange className="h-4 w-4 text-primary" />
                          <span className="capitalize">{formatDateLabel(group.dateKey)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {group.items.length} {t('closeTimesheetPage.table.records')}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.date')}</th>
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.time')}</th>
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.type')}</th>
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.user')}</th>
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.location')}</th>
                              <th className="px-3 py-2">{t('closeTimesheetPage.table.headers.notes')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((entry) => {
                              const clockKey = entry.clockedAt ? new Date(entry.clockedAt).toISOString() : ''
                              const isPending = summary.pendingIds.has(entry.id)
                              const isDuplicate = duplicatesSet.has(clockKey)
                              const statusLabel = isPending
                                ? t('closeTimesheetPage.table.status.pending')
                                : isDuplicate
                                  ? t('closeTimesheetPage.table.status.duplicate')
                                  : t('closeTimesheetPage.table.status.ok')
                              return (
                                <tr
                                  key={entry.id}
                                  className="rounded-xl border border-border/60 bg-background/80 text-sm shadow-[0_18px_50px_-32px_rgba(62,82,152,0.55)]"
                                >
                                  <td className="px-3 py-3 align-middle text-foreground">
                                    <div className="font-medium leading-tight">
                                      {entry.clockedAt
                                        ? format(new Date(entry.clockedAt), 'dd/MM/yyyy')
                                        : t('closeTimesheetPage.table.noDate')}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {entry.clockedAt
                                        ? format(new Date(entry.clockedAt), 'EEE', { locale: undefined })
                                        : ''}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                      {formatClock(entry.clockedAt)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    <span
                                      className={cn(
                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
                                        entry.type === 'in'
                                          ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200/60'
                                          : 'bg-sky-500/10 text-sky-700 border border-sky-200/70',
                                      )}
                                    >
                                      {entry.type || t('closeTimesheetPage.table.noType')}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    <div className="font-medium">
                                      {entry.user?.name || t('closeTimesheetPage.table.userFallback')}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {entry.user?.email || ''}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    {entry.latitude && entry.longitude ? (
                                      <Dialog
                                        open={locationEntry?.id === entry.id}
                                        onOpenChange={(open) => !open && setLocationEntry(null)}
                                      >
                                        <DialogTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex items-center gap-2 text-primary"
                                            onClick={() => setLocationEntry(entry)}
                                          >
                                            <MapPin className="h-4 w-4" />
                                            {t('closeTimesheetPage.table.viewLocation')}
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader className="space-y-1">
                                            <DialogTitle>{t('closeTimesheetPage.table.locationTitle')}</DialogTitle>
                                            <DialogDescription>
                                              {t('closeTimesheetPage.table.locationDescription')}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-2 rounded-xl bg-muted/50 p-4">
                                            <div className="flex items-center justify-between text-sm">
                                              <span className="font-medium">Latitude</span>
                                              <span>{entry.latitude}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                              <span className="font-medium">Longitude</span>
                                              <span>{entry.longitude}</span>
                                            </div>
                                            <a
                                              href={`https://maps.google.com/?q=${entry.latitude},${entry.longitude}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-2 text-primary underline"
                                            >
                                              <MapPin className="h-4 w-4" />
                                              {t('closeTimesheetPage.table.openMaps')}
                                            </a>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 align-middle">
                                    <span
                                      className={cn(
                                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                                        isPending
                                          ? 'bg-amber-500/10 text-amber-700 border border-amber-200/70'
                                          : isDuplicate
                                            ? 'bg-rose-500/10 text-rose-700 border border-rose-200/70'
                                            : 'bg-emerald-500/10 text-emerald-700 border border-emerald-200/70',
                                      )}
                                    >
                                      {statusLabel}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm">
                    <div className="text-muted-foreground">
                      {t('closeTimesheetPage.table.pagination', {
                        page: currentPage,
                        total: lastPage || Math.max(currentPage, 1),
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || loadingEntries}
                        onClick={() => handlePaginate('prev')}
                      >
                        {t('closeTimesheetPage.table.prev')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canGoNext || loadingEntries}
                        onClick={() => handlePaginate('next')}
                      >
                        {t('closeTimesheetPage.table.next')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  )
}

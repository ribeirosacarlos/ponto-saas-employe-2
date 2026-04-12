import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  endOfDay,
  endOfMonth,
  eachDayOfInterval,
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
  CalendarRange,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  RefreshCcw,
  Search,
  Timer,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { AppTopBar } from '../../components/ui/AppTopBar'
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
import { fetchAdminLocationSettings } from '../../services/adminLocationSettingsService'
import { listEmployees } from '../../services/modules/employees'
import { listTeamEntries } from '../../services/adminAdjustmentsService'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/useAuth'
import { downloadBlob } from '../../utils/pdf/downloadBlob'
import { generateSimpleTimesheetPdf } from '../../utils/pdf/simpleTimesheetPdf'

const PAGE_SIZE = 30
const EXPORT_PAGE_SIZE = 200

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

const hasFiniteCoordinates = (latitude?: number | null, longitude?: number | null) =>
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))

const calculateDistanceInMeters = (
  latitudeA?: number | null,
  longitudeA?: number | null,
  latitudeB?: number | null,
  longitudeB?: number | null,
) => {
  if (!hasFiniteCoordinates(latitudeA, longitudeA) || !hasFiniteCoordinates(latitudeB, longitudeB)) {
    return null
  }

  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusInMeters = 6371000
  const lat1 = Number(latitudeA)
  const lon1 = Number(longitudeA)
  const lat2 = Number(latitudeB)
  const lon2 = Number(longitudeB)
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(earthRadiusInMeters * c)
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
  company:
    employee.company ||
    employee.company_data ||
    employee.companyData ||
    (employee.company_name ? { name: employee.company_name } : undefined) ||
    null,
  shift:
    employee.shift ||
    (employee.shift_name ? { name: employee.shift_name } : undefined) ||
    (employee.shiftName ? { name: employee.shiftName } : undefined) ||
    null,
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

const groupEntriesByDate = (entries: any[] = [], order: 'asc' | 'desc' = 'desc') => {
  const groups = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const dateKey = entry.clockedAt ? format(new Date(entry.clockedAt), 'yyyy-MM-dd') : 'unknown'
    acc[dateKey] = acc[dateKey] ? [...acc[dateKey], entry] : [entry]
    return acc
  }, {})

  const sorter = (a: number, b: number) => (order === 'asc' ? a - b : b - a)

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
      return sorter(isNaN(left) ? 0 : left, isNaN(right) ? 0 : right)
    })
}

const firstNonEmpty = (...values: any[]) => values.find((value) => {
  if (value === undefined || value === null) return false
  const str = String(value).trim()
  return Boolean(str)
}) || ''

const getCompanyName = (employee: any, user: any) =>
  firstNonEmpty(
    employee?.company?.name,
    employee?.company_name,
    employee?.companyName,
    user?.company?.name,
    user?.company_name,
    user?.companyName,
  )

const getShiftName = (employee: any) =>
  firstNonEmpty(
    employee?.shift?.name,
    employee?.shift?.title,
    employee?.shift_name,
    employee?.shiftName,
    employee?.shift_title,
    employee?.shiftTitle,
  )

const addMissingDays = (days: { dateKey: string; items: any[] }[], from: string, to: string) => {
  const start = parseISO(from)
  const end = parseISO(to)
  if (!isValid(start) || !isValid(end)) return days

  const existing = new Set(days.map((day) => day.dateKey))
  const allDays = eachDayOfInterval({ start, end })
  allDays.forEach((day) => {
    const key = format(day, 'yyyy-MM-dd')
    if (!existing.has(key)) {
      days.push({ dateKey: key, items: [] })
    }
  })

  return days.sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
}

export default function CloseTimesheetPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const authUser = useAuthStore((state) => state.user)

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
  const [exporting, setExporting] = useState<'standard' | ''>('')
  const [locationEntry, setLocationEntry] = useState<any | null>(null)
  const [locationSettings, setLocationSettings] = useState<any | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false)
  const employeeComboboxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(employeeSearch.trim())
    }, 250)
    return () => window.clearTimeout(handler)
  }, [employeeSearch])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!employeeComboboxRef.current?.contains(event.target as Node)) {
        setEmployeeComboboxOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

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

  useEffect(() => {
    let active = true

    const loadLocationSettings = async () => {
      try {
        const response = await fetchAdminLocationSettings()
        if (active) setLocationSettings(response)
      } catch {
        if (active) setLocationSettings(null)
      }
    }

    loadLocationSettings()

    return () => {
      active = false
    }
  }, [])

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

  const activeQuickRange = useMemo(() => {
    const lastMonth = quickRanges.lastMonth()
    if (filters.from === lastMonth.from && filters.to === lastMonth.to) return 'lastMonth'

    const thisMonth = quickRanges.thisMonth()
    if (filters.from === thisMonth.from && filters.to === thisMonth.to) return 'thisMonth'

    const last30Days = quickRanges.last30Days()
    if (filters.from === last30Days.from && filters.to === last30Days.to) return 'last30Days'

    return ''
  }, [filters.from, filters.to])

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
    return groupEntriesByDate(normalizedEntries, 'desc')
  }, [normalizedEntries])

  const companyLocation = useMemo(() => {
    if (
      locationSettings?.location_validation_enabled !== true ||
      !hasFiniteCoordinates(locationSettings?.company_latitude, locationSettings?.company_longitude)
    ) {
      return null
    }

    return {
      latitude: Number(locationSettings.company_latitude),
      longitude: Number(locationSettings.company_longitude),
      allowedRadiusMeters: Number(locationSettings.allowed_radius_meters) || 0,
    }
  }, [locationSettings])

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
      setHasSearched(true)
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

  const ensureEntriesBeforeExport = () => {
    if (!normalizedEntries.length) {
      toast({
        title: t('closeTimesheetPage.export.emptyTitle'),
        description: t('closeTimesheetPage.export.emptyDescription'),
      })
      return false
    }
    setExporting('standard')
    return true
  }

  const fetchEntriesForExport = useCallback(async () => {
    const { from, to, employeeId } = appliedFilters
    const params = {
      userId: employeeId,
      dateFrom: formatISO(startOfDay(parseISO(from))),
      dateTo: formatISO(endOfDay(parseISO(to))),
      perPage: EXPORT_PAGE_SIZE,
    }

    let pageToLoad = 1
    let keepFetching = true
    const allEntries: any[] = []

    while (keepFetching) {
      const { data, meta: responseMeta } = await listTeamEntries({ ...params, page: pageToLoad })
      allEntries.push(...(data || []))

      const lastPage = responseMeta?.lastPage || responseMeta?.last_page
      const total = responseMeta?.total
      const perPage = responseMeta?.perPage || responseMeta?.per_page || params.perPage

      if (lastPage) {
        keepFetching = pageToLoad < lastPage
      } else if (total) {
        keepFetching = allEntries.length < total
      } else {
        keepFetching = (data?.length || 0) >= perPage
      }

      pageToLoad += 1
    }

    return allEntries
  }, [appliedFilters])

  const exportPdf = async () => {
    if (!ensureEntriesBeforeExport()) return
    try {
      const allEntries = await fetchEntriesForExport()
      const normalizedExportEntries = allEntries.map((entry: any, index: number) =>
        normalizeEntry(entry, index),
      )
      const groupedForExport = groupEntriesByDate(normalizedExportEntries, 'asc')
      const fullDays = addMissingDays([...groupedForExport], appliedFilters.from, appliedFilters.to)
      const employeeLabel =
        selectedEmployee?.name || selectedEmployee?.email || t('closeTimesheetPage.table.userFallback')
      const companyLabel = getCompanyName(selectedEmployee, authUser)
      const shiftLabel = getShiftName(selectedEmployee) || ''
      const periodLabel = `${formatDateLabel(appliedFilters.from)} - ${formatDateLabel(appliedFilters.to)}`

      const blob = generateSimpleTimesheetPdf({
        days: fullDays,
        employeeLabel,
        companyLabel,
        shiftLabel,
        periodLabel,
        locale: i18n.language,
        formatClock,
        formatDateLabel,
        t,
      })

      downloadBlob({
        blob,
        fallbackFilename: buildFilename('folha-ponto'),
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

  return (
    <div className="relative min-h-screen">
      <PageContainer className="pb-16 pt-8 lg:pt-10">
        <div className="flex flex-col gap-6">
          <AppTopBar
            icon={<Clock3 className="h-5 w-5" />}
            eyebrow={t('closeTimesheetPage.badge')}
            title={t('closeTimesheetPage.title')}
            subtitle={t('closeTimesheetPage.subtitle')}
          />

          <Card className="overflow-visible border-dashed">
            <CardHeader className="space-y-1 pb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{t('closeTimesheetPage.filters.title')}</span>
              </div>
              <div>
                <CardTitle className="text-base">{t('closeTimesheetPage.table.title')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('closeTimesheetPage.table.subtitle')}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <div className="flex gap-2 sm:flex-nowrap">
                {([
                  ['lastMonth', t('closeTimesheetPage.filters.quick.lastMonth')],
                  ['thisMonth', t('closeTimesheetPage.filters.quick.thisMonth')],
                  ['last30Days', t('closeTimesheetPage.filters.quick.last30Days')],
                ] as const).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={activeQuickRange === key ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleQuickRange(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-2 rounded-[18px] border border-border/70 bg-background/70 p-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('closeTimesheetPage.filters.from')}
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.from}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, from: event.target.value }))
                      }
                      className="h-10 pr-10"
                    />
                    <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="hidden items-center justify-center pb-3 text-sm font-semibold text-muted-foreground sm:flex">
                  →
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('closeTimesheetPage.filters.to')}
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.to}
                      min={filters.from}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, to: event.target.value }))
                      }
                      className="h-10 pr-10"
                    />
                    <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('closeTimesheetPage.filters.employee')}
                  </label>
                  <div ref={employeeComboboxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setEmployeeComboboxOpen((prev) => !prev)}
                    className={cn(
                      'flex h-10 w-full items-center gap-3 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-left text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/70',
                      employeeComboboxOpen && 'border-ring',
                    )}
                  >
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {selectedEmployee ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-foreground">
                            {selectedEmployee.name || selectedEmployee.email}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                            <span className="truncate">{selectedEmployee.email}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                setFilters((prev) => ({ ...prev, employeeId: '' }))
                                setEmployeeSearch('')
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setFilters((prev) => ({ ...prev, employeeId: '' }))
                                  setEmployeeSearch('')
                                }
                              }}
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/80"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('closeTimesheetPage.filters.searchPlaceholder')}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        employeeComboboxOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {employeeComboboxOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[18px] border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] backdrop-blur-xl">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={employeeSearch}
                          onChange={(event) => setEmployeeSearch(event.target.value)}
                          placeholder={t('closeTimesheetPage.filters.searchPlaceholder')}
                          className="h-10 pl-9"
                        />
                      </div>

                      <div className="mt-2 max-h-64 space-y-2 overflow-auto pr-1">
                        {employeesLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((item) => (
                              <div
                                key={item}
                                className="h-10 w-full animate-pulse rounded-xl bg-muted/70"
                              />
                            ))}
                          </div>
                        ) : employeesError ? (
                          <div className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-500/10 px-3 py-3 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span className="text-sm">{employeesError}</span>
                          </div>
                        ) : filteredEmployees.length ? (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, employeeId: emp.id }))
                                setEmployeeComboboxOpen(false)
                              }}
                              className={cn(
                                'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                                emp.id === filters.employeeId
                                  ? 'border-primary/60 bg-primary/10'
                                  : 'border-border/70 bg-background/70 hover:border-primary/30 hover:bg-muted/60',
                              )}
                            >
                              <UserRound
                                className={cn(
                                  'mt-0.5 h-4 w-4 shrink-0',
                                  emp.id === filters.employeeId ? 'text-primary' : 'text-muted-foreground',
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {emp.name || emp.email}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {emp.email}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                            {t('closeTimesheetPage.filters.empty')}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  </div>
                </div>
                <div className="flex w-full gap-2 lg:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 lg:min-w-[112px] lg:flex-none"
                    onClick={() => {
                      setFilters({
                        employeeId: '',
                        from: defaultRange.from,
                        to: defaultRange.to,
                      })
                      setEmployeeSearch('')
                      setEmployeeComboboxOpen(false)
                      setHasSearched(false)
                    }}
                  >
                    {t('closeTimesheetPage.filters.reset')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-[1.4] lg:min-w-[148px]"
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

              {hasSearched ? (
                <div className="space-y-4 border-t border-border/70 pt-5">
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        {t('closeTimesheetPage.summary.entries')}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xl font-semibold leading-none">{summary.totalEntries}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">{t('closeTimesheetPage.summary.days')}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xl font-semibold leading-none">{summary.daysWithRecords}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        {t('closeTimesheetPage.summary.hours')}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xl font-semibold leading-none">{formatMinutes(summary.totalMinutes)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        {t('closeTimesheetPage.summary.inconsistencies')}
                      </p>
                      <div className="mt-1.5 flex items-start gap-1.5 text-amber-600 dark:text-amber-100">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div className="text-xs leading-5">
                          <div>{t('closeTimesheetPage.summary.pendingCount', { count: summary.pendingCount })}</div>
                          <div>{t('closeTimesheetPage.summary.duplicateCount', { count: summary.duplicateCount })}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t('closeTimesheetPage.table.title')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('closeTimesheetPage.table.subtitle')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={exporting === 'standard' || !normalizedEntries.length}
                        onClick={() => exportPdf()}
                      >
                        {exporting === 'standard' ? (
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {t('closeTimesheetPage.export.primary')}
                      </Button>
                    </div>
                  </div>

                  {loadingEntries ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-16 w-full animate-pulse rounded-xl bg-muted/70" />
                      ))}
                    </div>
                  ) : entriesError ? (
                    <div className="flex items-center gap-3 rounded-xl border border-rose-200/70 bg-rose-500/10 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                      <AlertCircle className="h-5 w-5" />
                      <div className="space-y-1">
                        <p className="font-medium">{t('closeTimesheetPage.states.entriesErrorTitle')}</p>
                        <p className="text-sm">{entriesError}</p>
                      </div>
                    </div>
                  ) : groupedEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-8 text-center text-muted-foreground">
                      {t('closeTimesheetPage.states.empty')}
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
                              const hasCoordinates = hasFiniteCoordinates(entry.latitude, entry.longitude)
                              const distanceFromCompany = companyLocation
                                ? calculateDistanceInMeters(
                                    entry.latitude,
                                    entry.longitude,
                                    companyLocation.latitude,
                                    companyLocation.longitude,
                                  )
                                : null
                              const isOutsideCompany =
                                distanceFromCompany !== null &&
                                distanceFromCompany > (companyLocation?.allowedRadiusMeters ?? 0)
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
                                    {hasCoordinates ? (
                                      <div className="flex flex-col items-start gap-2">
                                        {distanceFromCompany !== null ? (
                                          <span
                                            className={cn(
                                              'rounded-full border px-2.5 py-1 text-xs font-semibold',
                                              isOutsideCompany
                                                ? 'border-rose-200/70 bg-rose-500/10 text-rose-700'
                                                : 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
                                            )}
                                          >
                                            {isOutsideCompany
                                              ? t('closeTimesheetPage.table.locationStatus.outside')
                                              : t('closeTimesheetPage.table.locationStatus.inside')}
                                          </span>
                                        ) : null}
                                      <Dialog
                                        open={locationEntry?.id === entry.id}
                                        onOpenChange={(open) => !open && setLocationEntry(null)}
                                      >
                                        <DialogTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex items-center gap-2 px-0 text-primary hover:bg-transparent"
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
                                            {distanceFromCompany !== null ? (
                                              <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">
                                                  {t('closeTimesheetPage.table.distanceFromCompany')}
                                                </span>
                                                <span>
                                                  {t('closeTimesheetPage.table.distanceValue', {
                                                    distance: distanceFromCompany,
                                                  })}
                                                </span>
                                              </div>
                                            ) : null}
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
                                      </div>
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
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  )
}




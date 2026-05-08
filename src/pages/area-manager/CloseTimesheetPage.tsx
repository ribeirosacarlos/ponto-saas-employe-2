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
  Monitor,
  Pencil,
  RefreshCcw,
  Search,
  Smartphone,
  Timer,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { AppTopBar } from '../../components/ui/AppTopBar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import { PageContainer } from '../../components/ui/PageContainer'
import { useToast } from '../../components/ui/use-toast'
import { canRenderCard, getCapabilitiesFromRoles } from '../../auth/acl'
import { fetchAdminLocationSettings } from '../../services/adminLocationSettingsService'
import { listEmployees } from '../../services/modules/employees'
import { deleteTimeEntry, listTeamEntries } from '../../services/adminAdjustmentsService'
import { cn } from '../../lib/utils'
import { PAGE_PATHS } from '../../routes/config'
import { useAuthStore } from '../../store/useAuth'
import { downloadBlob } from '../../utils/pdf/downloadBlob'
import { generateSimpleTimesheetPdf } from '../../utils/pdf/simpleTimesheetPdf'

const PAGE_SIZE = 30
const EXPORT_PAGE_SIZE = 200
const DELETE_TIME_ENTRY_REQUIRES = { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] }
const ADJUSTMENT_SYNC_KEY = 'admin-adjustment-sync'

const getLastMonthRange = () => {
  const today = new Date()
  const start = startOfMonth(subMonths(today, 1))
  const end = endOfMonth(subMonths(today, 1))
  return {
    from: format(start, 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  }
}

const getLast7DaysRange = () => {
  const today = new Date()
  const start = startOfDay(subDays(today, 6))
  const end = endOfDay(today)
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
  last7Days: getLast7DaysRange,
}

const formatMinutes = (minutes?: number) => {
  const total = Number.isFinite(minutes) ? Number(minutes) : 0
  const hours = String(Math.floor(total / 60)).padStart(2, '0')
  const mins = String(Math.max(0, Math.round(total % 60))).padStart(2, '0')
  return `${hours}:${mins}`
}

const formatWholeHours = (minutes?: number) => {
  const total = Number.isFinite(minutes) ? Number(minutes) : 0
  return Math.floor(total / 60)
}

const computeDayMinutes = (items: any[]): number => {
  const sorted = [...items].sort((a, b) => {
    const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
    const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
    return left - right
  })
  let total = 0
  const openIns: number[] = []
  sorted.forEach((entry) => {
    if (!entry.clockedAt) return
    const ts = new Date(entry.clockedAt).getTime()
    if (!Number.isFinite(ts)) return
    if (entry.type === 'in') {
      openIns.push(ts)
    } else if (entry.type === 'out' && openIns.length) {
      const start = openIns.shift()!
      total += Math.max(0, Math.round((ts - start) / 60000))
    }
  })
  return total
}

const isPendingApprovalAdjustment = (entry: any = {}) => {
  const source = String(entry?.source ?? entry?.proposed_source ?? entry?.proposedSource ?? '')
    .trim()
    .toLowerCase()
  const adjustmentStatus = String(entry?.adjustment_status ?? entry?.status ?? entry?.state ?? '')
    .trim()
    .toLowerCase()

  return (
    ['adjustment', 'proposed_adjustment'].includes(source) &&
    adjustmentStatus === 'pending'
  )
}

const isPresentCoordinate = (value?: number | string | null) => {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return Number.isFinite(Number(value))
}

const hasFiniteCoordinates = (
  latitude?: number | string | null,
  longitude?: number | string | null,
) => isPresentCoordinate(latitude) && isPresentCoordinate(longitude)

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
    timeEntryId: entry.timeEntryId ?? entry.id ?? entry.time_entry_id ?? entry.uuid ?? null,
    userId: entry.userId ?? entry.user_id ?? entry.employee_id ?? entry.user?.id ?? entry.employee?.id ?? null,
    clockedAt: clock,
    type: entry.type ?? entry.event_type ?? entry.kind ?? '',
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null,
    source: entry.source ?? entry.origin ?? '',
    deviceType: entry.device_type ?? entry.deviceType ?? null,
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

const getEmployeeDisplayName = (
  employee?: { name?: string; full_name?: string; fullName?: string; email?: string } | null,
) => employee?.name || employee?.full_name || employee?.fullName || employee?.email || 'Colaborador'

const withSevenDayRangeIfMultiple = (state: {
  employeeIds: string[]
  from: string
  to: string
}) => {
  if ((state.employeeIds?.length || 0) <= 1) return state
  const range = quickRanges.last7Days()
  return {
    ...state,
    from: range.from,
    to: range.to,
  }
}

const buildTimesheetSummary = (entries = []) => {
  const duplicateMap = new Map()
  const pendingIds = new Set()
  let totalMinutes = 0

  const groups = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const clock = entry.clockedAt
    if (clock) {
      const employeeKey =
        entry.userId ?? entry.user_id ?? entry.employee_id ?? entry.user?.id ?? entry.employee?.id ?? 'unknown-user'
      const clockKey = `${employeeKey}:${new Date(clock).toISOString()}`
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
  const roles = useAuthStore((state) => state.roles)
  const logout = useAuthStore((state) => state.logout)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const canDeleteTimeEntries = useMemo(
    () => canRenderCard(capabilities, DELETE_TIME_ENTRY_REQUIRES),
    [capabilities],
  )

  const defaultRange = useMemo(() => getLastMonthRange(), [])
  const [employees, setEmployees] = useState<any[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [filters, setFilters] = useState({
    employeeIds: [] as string[],
    from: defaultRange.from,
    to: defaultRange.to,
  })
  const [appliedFilters, setAppliedFilters] = useState({
    employeeIds: [] as string[],
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
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | number | null>(null)
  const [locationSettings, setLocationSettings] = useState<any | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false)
  const [employeeComboboxOpenUpward, setEmployeeComboboxOpenUpward] = useState(false)
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

  useEffect(() => {
    if (!employeeComboboxOpen || !employeeComboboxRef.current || typeof window === 'undefined') return

    const updateComboboxDirection = () => {
      const rect = employeeComboboxRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const estimatedDropdownHeight = 360

      setEmployeeComboboxOpenUpward(
        spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow,
      )
    }

    updateComboboxDirection()
    window.addEventListener('resize', updateComboboxDirection)

    return () => window.removeEventListener('resize', updateComboboxDirection)
  }, [employeeComboboxOpen])

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

  const employeesById = useMemo(
    () => new Map(employees.map((emp) => [String(emp.id), emp])),
    [employees],
  )

  const selectedEmployees = useMemo(
    () =>
      filters.employeeIds
        .map((employeeId) => employeesById.get(String(employeeId)))
        .filter(Boolean) as any[],
    [employeesById, filters.employeeIds],
  )

  const appliedSelectedEmployees = useMemo(
    () =>
      appliedFilters.employeeIds
        .map((employeeId) => employeesById.get(String(employeeId)))
        .filter(Boolean) as any[],
    [appliedFilters.employeeIds, employeesById],
  )

  const appliedSelectedEmployee =
    appliedSelectedEmployees.length === 1 ? appliedSelectedEmployees[0] : null
  const hasMultipleEmployeesSelected = filters.employeeIds.length > 1
  const hasAppliedMultipleEmployees = appliedFilters.employeeIds.length > 1

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

    const last7Days = quickRanges.last7Days()
    if (filters.from === last7Days.from && filters.to === last7Days.to) return 'last7Days'

    return ''
  }, [filters.from, filters.to])

  const canSearch =
    filters.employeeIds.length > 0 &&
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

  const formatEntryType = useCallback(
    (value?: string) => {
      const normalized = String(value || '')
        .trim()
        .toLowerCase()

      if (normalized === 'in') return t('types.in')
      if (normalized === 'out') return t('types.out')
      return value || t('closeTimesheetPage.table.noType')
    },
    [t],
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
    if (hasMultipleEmployeesSelected && key !== 'last7Days') return
    const range = quickRanges[key]()
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to }))
  }

  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setFilters((prev) => {
      const isSelected = prev.employeeIds.includes(employeeId)
      const employeeIds = isSelected
        ? prev.employeeIds.filter((id) => id !== employeeId)
        : [...prev.employeeIds, employeeId]

      return withSevenDayRangeIfMultiple({
        ...prev,
        employeeIds,
      })
    })
  }, [])

  const fetchAllEntriesByEmployee = useCallback(
    async ({
      employeeId,
      from,
      to,
    }: {
      employeeId: string
      from: string
      to: string
    }) => {
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
    },
    [],
  )

  const resolveEntryEmployee = useCallback(
    (entry: any) => {
      const entryUser = entry?.user ?? entry?.employee ?? null
      if (entryUser?.name || entryUser?.full_name || entryUser?.fullName || entryUser?.email) {
        return entryUser
      }

      const entryUserId =
        entry?.userId ?? entry?.user_id ?? entry?.employee_id ?? entry?.user?.id ?? entry?.employee?.id ?? ''

      return entryUserId ? employeesById.get(String(entryUserId)) || null : null
    },
    [employeesById],
  )

  const groupedEntriesByEmployee = useMemo(() => {
    if (!hasAppliedMultipleEmployees) return []

    const sections = new Map<
      string,
      {
        employeeId: string
        employee: any
        entries: any[]
      }
    >()

    normalizedEntries.forEach((entry) => {
      const employee = resolveEntryEmployee(entry)
      const employeeId = String(
        employee?.id ??
          entry?.userId ??
          entry?.user_id ??
          entry?.employee_id ??
          entry?.user?.id ??
          entry?.employee?.id ??
          'unknown-user',
      )

      const current = sections.get(employeeId)
      if (current) {
        current.entries.push(entry)
        if (!current.employee && employee) current.employee = employee
        return
      }

      sections.set(employeeId, {
        employeeId,
        employee,
        entries: [entry],
      })
    })

    const selectedOrder = appliedFilters.employeeIds.map(String)

    return Array.from(sections.values())
      .map((section) => {
        const employeeSummary = buildTimesheetSummary(section.entries)
        const employeeDuplicatesSet = new Set<string>()
        employeeSummary.duplicateMap?.forEach((count, key) => {
          if (count > 1) employeeDuplicatesSet.add(key)
        })

        return {
          ...section,
          groups: groupEntriesByDate(section.entries, 'desc'),
          summary: employeeSummary,
          duplicatesSet: employeeDuplicatesSet,
        }
      })
      .sort((left, right) => {
        const leftIndex = selectedOrder.indexOf(String(left.employeeId))
        const rightIndex = selectedOrder.indexOf(String(right.employeeId))

        if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex
        if (leftIndex !== -1) return -1
        if (rightIndex !== -1) return 1

        return getEmployeeDisplayName(left.employee).localeCompare(getEmployeeDisplayName(right.employee))
      })
  }, [
    appliedFilters.employeeIds,
    hasAppliedMultipleEmployees,
    normalizedEntries,
    resolveEntryEmployee,
  ])

  const handleSearch = useCallback(
    async (pageToLoad = 1) => {
      if (!canSearch) return
      setHasSearched(true)
      setLoadingEntries(true)
      setEntriesError('')
      try {
        const { from, to, employeeIds } = filters

        if (employeeIds.length > 1) {
          const allEntriesByEmployee = await Promise.all(
            employeeIds.map((employeeId) => fetchAllEntriesByEmployee({ employeeId, from, to })),
          )

          const mergedEntries = allEntriesByEmployee
            .flat()
            .sort((left, right) => {
              const leftTime = left?.clockedAt ? new Date(left.clockedAt).getTime() : 0
              const rightTime = right?.clockedAt ? new Date(right.clockedAt).getTime() : 0
              return rightTime - leftTime
            })

          setEntries(mergedEntries)
          setMeta({
            currentPage: 1,
            perPage: mergedEntries.length || PAGE_SIZE,
            total: mergedEntries.length,
            lastPage: 1,
          })
          setPage(1)
          setAppliedFilters({
            employeeIds: [...employeeIds],
            from,
            to,
          })
          return
        }

        const params = {
          userId: employeeIds[0],
          dateFrom: formatISO(startOfDay(parseISO(from))),
          dateTo: formatISO(endOfDay(parseISO(to))),
          page: pageToLoad,
          perPage: PAGE_SIZE,
        }

        const { data, meta: responseMeta } = await listTeamEntries(params)
        setEntries(data || [])
        setMeta(responseMeta || null)
        setPage(responseMeta?.currentPage || pageToLoad || 1)
        setAppliedFilters({
          employeeIds: [...employeeIds],
          from,
          to,
        })
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
    [canSearch, fetchAllEntriesByEmployee, filters, t, toast],
  )

  const refreshSingleEntry = useCallback(
    async ({
      timeEntryId,
      userId,
      clockedAt,
    }: {
      timeEntryId?: string | number
      userId?: string | number
      clockedAt?: string
    }) => {
      if (!timeEntryId || !clockedAt) return

      try {
        const parsedClock = new Date(clockedAt)
        if (!isValid(parsedClock)) return

        const employeeId = userId || appliedFilters.employeeIds[0] || filters.employeeIds[0]
        const { data } = await listTeamEntries({
          userId: employeeId || undefined,
          dateFrom: formatISO(startOfDay(parsedClock)),
          dateTo: formatISO(endOfDay(parsedClock)),
          page: 1,
          perPage: PAGE_SIZE,
        })

        const normalizedEntriesForDay = (data || []).map((entry: any, index: number) =>
          normalizeEntry(entry, index),
        )
        const updatedEntry = normalizedEntriesForDay.find(
          (entry) => String(entry.timeEntryId ?? entry.id) === String(timeEntryId),
        )

        if (!updatedEntry) return

        setEntries((prev) =>
          prev.map((entry) =>
            String(entry.timeEntryId ?? entry.id) === String(timeEntryId) ? updatedEntry : entry,
          ),
        )
      } catch (error) {
        console.error('[closeTimesheet] failed to refresh single entry', error)
      }
    },
    [appliedFilters.employeeIds, filters.employeeIds],
  )

  const handlePaginate = async (direction: 'prev' | 'next') => {
    const nextPage = direction === 'next' ? (page || 1) + 1 : Math.max(1, (page || 1) - 1)
    await handleSearch(nextPage)
  }

  const handleDeleteTimeEntry = useCallback(async () => {
    if (!deleteTarget?.timeEntryId) return

    const timeEntryId = deleteTarget.timeEntryId
    setDeletingEntryId(timeEntryId)

    try {
      const response = await deleteTimeEntry(timeEntryId)
      toast({
        title: t('closeTimesheetPage.delete.successTitle', 'Registro excluído'),
        description:
          response?.message ||
          t('closeTimesheetPage.delete.successDescription', 'Registro de ponto excluído com sucesso.'),
        variant: 'success',
      })
      setEntries((prev) =>
        prev.filter((entry) => {
          const entryTimeEntryId =
            entry?.timeEntryId ?? entry?.id ?? entry?.time_entry_id ?? entry?.uuid ?? null
          return String(entryTimeEntryId) !== String(timeEntryId)
        }),
      )
      setMeta((prev) => {
        if (!prev) return prev

        const currentTotal = Number(prev.total)
        const nextTotal = Number.isFinite(currentTotal) ? Math.max(0, currentTotal - 1) : prev.total

        return {
          ...prev,
          total: nextTotal,
        }
      })
      setDeleteTarget(null)
    } catch (error: any) {
      const status = error?.response?.status

      if (status === 401) {
        toast({
          title: t('toast.sessionExpired.title'),
          description: error?.response?.data?.message || t('toast.sessionExpired.description'),
          variant: 'error',
        })
        setDeleteTarget(null)
        await logout()
        return
      }

      const description =
        status === 403
          ? t(
              'closeTimesheetPage.delete.forbiddenDescription',
              'Você não tem permissão para excluir este registro.',
            )
          : status === 404
            ? t(
                'closeTimesheetPage.delete.notFoundDescription',
                'Registro não encontrado ou já removido.',
              )
            : t(
                'closeTimesheetPage.delete.errorDescription',
                'Não foi possível excluir o registro de ponto.',
              )

      toast({
        title: t('closeTimesheetPage.delete.errorTitle', 'Erro ao excluir registro'),
        description,
        variant: 'error',
      })
    } finally {
      setDeletingEntryId(null)
    }
  }, [deleteTarget, logout, t, toast])

  const buildFilename = (suffix = 'folha-ponto') => {
    const name =
      appliedSelectedEmployee?.name?.trim().toLowerCase().replace(/\s+/g, '-') ||
      appliedSelectedEmployee?.email?.split('@')[0] ||
      (appliedFilters.employeeIds.length > 1 ? `${appliedFilters.employeeIds.length}-funcionarios` : '') ||
      'funcionario'
    const fromLabel = appliedFilters.from || filters.from
    const toLabel = appliedFilters.to || filters.to
    return `${suffix}_${name}_${fromLabel}_a_${toLabel}.pdf`
  }

  const ensureEntriesBeforeExport = () => {
    if (appliedFilters.employeeIds.length > 1) {
      toast({
        title: t('closeTimesheetPage.export.multipleEmployeesTitle', 'Exportação indisponível'),
        description: t(
          'closeTimesheetPage.export.multipleEmployeesDescription',
          'Selecione apenas um funcionário para exportar a folha em PDF.',
        ),
        variant: 'error',
      })
      return false
    }

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
    const { from, to, employeeIds } = appliedFilters
    if (!employeeIds[0]) return []
    return fetchAllEntriesByEmployee({
      employeeId: employeeIds[0],
      from,
      to,
    })
  }, [appliedFilters, fetchAllEntriesByEmployee])

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
        appliedSelectedEmployee?.name ||
        appliedSelectedEmployee?.email ||
        t('closeTimesheetPage.table.userFallback')
      const companyLabel = getCompanyName(appliedSelectedEmployee, authUser)
      const shiftLabel = getShiftName(appliedSelectedEmployee) || ''
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

  const openPendingAdjustments = useCallback((entry: any) => {
    const selectedEmployeeId =
      entry?.userId ??
      entry?.user_id ??
      entry?.user?.id ??
      appliedFilters.employeeIds[0] ??
      filters.employeeIds[0] ??
      ''

    const params = new URLSearchParams()
    params.set('status', 'pending')
    if (selectedEmployeeId) {
      params.set('userId', String(selectedEmployeeId))
    }

    window.open(`${PAGE_PATHS.adminAdjustments}?${params.toString()}`, '_blank', 'noopener')
  }, [appliedFilters.employeeIds, filters.employeeIds])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ADJUSTMENT_SYNC_KEY || !event.newValue) return

      try {
        const payload = JSON.parse(event.newValue)
        refreshSingleEntry(payload)
      } catch (error) {
        console.error('[closeTimesheet] failed to parse adjustment sync payload', error)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshSingleEntry])

  const currentPage = meta?.currentPage || page || 1
  const lastPage = meta?.lastPage || meta?.last_page || null
  const total = meta?.total
  const canGoNext = lastPage ? currentPage < lastPage : total ? currentPage * PAGE_SIZE < total : true

  const renderEntriesTable = ({
    groups,
    tableSummary,
    tableDuplicatesSet,
  }: {
    groups: Array<{ dateKey: string; items: any[] }>
    tableSummary: any
    tableDuplicatesSet: Set<string>
  }) => (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed">
          <thead>
            <tr className="border-b border-border/70 text-left text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="w-[130px] px-3 py-3">{t('closeTimesheetPage.table.headers.date')}</th>
              <th className="w-[85px] px-3 py-3">{t('closeTimesheetPage.table.headers.time')}</th>
              <th className="w-[100px] px-3 py-3">{t('closeTimesheetPage.table.headers.type')}</th>
              <th className="w-[115px] px-3 py-3">{t('closeTimesheetPage.table.headers.device', 'Dispositivo')}</th>
              <th className="w-[185px] px-3 py-3">{t('closeTimesheetPage.table.headers.location')}</th>
              <th className="w-[165px] px-3 py-3">{t('closeTimesheetPage.table.headers.status')}</th>
              <th className="w-[80px] px-3 py-3 text-right">
                {t('closeTimesheetPage.table.headers.actions', 'Ações')}
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => {
              const dayMins = computeDayMinutes(group.items)
              const dateRows = group.items.map((entry, index) => {
                const employeeKey =
                  entry?.userId ??
                  entry?.user_id ??
                  entry?.employee_id ??
                  entry?.user?.id ??
                  entry?.employee?.id ??
                  'unknown-user'
                const clockKey = entry.clockedAt
                  ? `${employeeKey}:${new Date(entry.clockedAt).toISOString()}`
                  : ''
                const isPending = tableSummary.pendingIds.has(entry.id)
                const isDuplicate = tableDuplicatesSet.has(clockKey)
                const hasPendingAdjustment = isPendingApprovalAdjustment(entry)
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
                const canDeleteEntry = canDeleteTimeEntries && Boolean(entry.timeEntryId)
                const isDeletingEntry = deletingEntryId === entry.timeEntryId
                const statusLabel = hasPendingAdjustment
                  ? t('closeTimesheetPage.table.status.adjustmentPending')
                  : isPending
                    ? t('closeTimesheetPage.table.status.pending')
                    : isDuplicate
                      ? t('closeTimesheetPage.table.status.duplicate')
                      : t('closeTimesheetPage.table.status.ok')
                const statusClassName = hasPendingAdjustment
                  ? 'text-sky-700 dark:text-sky-300'
                  : isPending
                    ? 'text-amber-700 dark:text-amber-300'
                    : isDuplicate
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                const locationLabel = !hasCoordinates
                  ? '—'
                  : distanceFromCompany !== null
                    ? isOutsideCompany
                      ? t('closeTimesheetPage.table.locationStatus.outside')
                      : t('closeTimesheetPage.table.locationStatus.inside')
                    : t('closeTimesheetPage.table.locationTitle')

                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      'border-b border-border/40 text-[13px] transition-colors hover:bg-muted/45',
                      index === group.items.length - 1 ? 'last:border-b-0' : '',
                    )}
                  >
                    <td className="px-3 py-2.5 align-middle text-muted-foreground">
                      {group.dateKey && group.dateKey !== 'unknown'
                        ? format(parseISO(group.dateKey), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span className="font-medium text-foreground">{formatClock(entry.clockedAt)}</span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none',
                          entry.type === 'in'
                            ? 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                            : 'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
                        )}
                      >
                        {formatEntryType(entry.type)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {entry.deviceType ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          {entry.deviceType === 'mobile' ? (
                            <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {entry.deviceType === 'mobile'
                            ? t('closeTimesheetPage.table.device.mobile', 'Mobile')
                            : t('closeTimesheetPage.table.device.web', 'Web')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {hasCoordinates ? (
                        <div className="flex items-center gap-2 text-[13px] text-foreground">
                          <span
                            className={cn(
                              'truncate',
                              isOutsideCompany
                                ? 'font-semibold text-rose-700 dark:text-rose-300'
                                : 'text-foreground',
                            )}
                          >
                            {locationLabel}
                          </span>
                          <Dialog
                            open={locationEntry?.id === entry.id}
                            onOpenChange={(open) => !open && setLocationEntry(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-6 w-6 shrink-0 rounded-full p-0 hover:bg-muted',
                                  isOutsideCompany
                                    ? 'text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200'
                                    : 'text-muted-foreground hover:text-foreground',
                                )}
                                onClick={() => setLocationEntry(entry)}
                                aria-label={t('closeTimesheetPage.table.viewLocation')}
                                title={t('closeTimesheetPage.table.viewLocation')}
                              >
                                <MapPin className="h-3.5 w-3.5" />
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
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {hasPendingAdjustment ? (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-medium underline decoration-transparent underline-offset-2 transition hover:decoration-current',
                            statusClassName,
                          )}
                          onClick={() => openPendingAdjustments(entry)}
                          title={statusLabel}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {statusLabel}
                        </button>
                      ) : (
                        <span className={cn('font-medium', statusClassName)}>{statusLabel}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {canDeleteEntry ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-rose-600 dark:hover:text-rose-400"
                            disabled={isDeletingEntry}
                            onClick={() => setDeleteTarget(entry)}
                            aria-label={
                              isDeletingEntry
                                ? t('closeTimesheetPage.delete.deleting', 'Excluindo...')
                                : t('closeTimesheetPage.delete.action', 'Excluir')
                            }
                            title={
                              isDeletingEntry
                                ? t('closeTimesheetPage.delete.deleting', 'Excluindo...')
                                : t('closeTimesheetPage.delete.action', 'Excluir')
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {!canDeleteEntry ? <span className="text-muted-foreground">—</span> : null}
                      </div>
                    </td>
                  </tr>
                )
              })

              return [
                <tr key={`${group.dateKey}-separator`} className="border-b border-border/50">
                  <td
                    colSpan={7}
                    className="bg-background/70 px-3 py-2 text-[12px] font-medium text-muted-foreground"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span className="capitalize">{formatDateLabel(group.dateKey)}</span>
                        {group.items.length > 0 && (
                          <span className="text-[11px] text-muted-foreground/60">
                            · {group.items.length} {t('closeTimesheetPage.table.records', 'registros')}
                          </span>
                        )}
                      </div>
                      {dayMins > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Timer className="h-3 w-3 text-muted-foreground/70" />
                          <span className="font-mono font-semibold text-foreground">{formatMinutes(dayMins)}</span>
                          <span className="text-muted-foreground/70">{t('closeTimesheetPage.table.dailyTotal', 'trabalhadas')}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>,
                ...dateRows,
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

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
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <span>{t('closeTimesheetPage.filters.title')}</span>
                </div>
                <CardTitle className="mt-0.5 text-xs font-semibold">{t('closeTimesheetPage.table.title')}</CardTitle>
              </div>
              <p className="hidden text-[11px] text-muted-foreground lg:block">
                {t('closeTimesheetPage.table.subtitle')}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="grid gap-2 xl:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] xl:items-end">
              <div className="space-y-1.5">
              <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1 sm:flex-nowrap">
                {([
                  ['lastMonth', t('closeTimesheetPage.filters.quick.lastMonth')],
                  ['thisMonth', t('closeTimesheetPage.filters.quick.thisMonth')],
                  ['last7Days', t('closeTimesheetPage.filters.quick.last7Days')],
                ] as const).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={activeQuickRange === key ? 'default' : 'ghost'}
                    className="h-7 flex-1 rounded-md px-2 text-[11px]"
                    disabled={hasMultipleEmployeesSelected && key !== 'last7Days'}
                    onClick={() => handleQuickRange(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-1.5 rounded-lg border border-border/70 bg-background/70 p-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {t('closeTimesheetPage.filters.from')}
                </span>
                  <div className="relative min-w-0">
                    <Input
                      type="date"
                      value={filters.from}
                      disabled={hasMultipleEmployeesSelected}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, from: event.target.value }))
                      }
                      className="h-8 rounded-md pr-8 text-[11px]"
                    />
                    <CalendarRange className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                    {t('closeTimesheetPage.filters.to')}
                </span>
                  <div className="relative min-w-0">
                    <Input
                      type="date"
                      value={filters.to}
                      min={filters.from}
                      disabled={hasMultipleEmployeesSelected}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, to: event.target.value }))
                      }
                      className="h-8 rounded-md pr-8 text-[11px]"
                    />
                    <CalendarRange className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
              </div>
              {hasMultipleEmployeesSelected ? (
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    'closeTimesheetPage.filters.multiRangeHint',
                    'Com múltiplos funcionários selecionados, o período fica limitado aos últimos 7 dias.',
                  )}
                </p>
              ) : null}
              </div>

              <div className="grid gap-1.5 self-start xl:grid-cols-[minmax(16rem,1fr)_auto] xl:items-end">
                <div className="min-w-0 space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    {t('closeTimesheetPage.filters.employee')}
                  </label>
                  <div ref={employeeComboboxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setEmployeeComboboxOpen((prev) => !prev)}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-md border border-border/80 bg-background/80 px-2.5 py-1.5 text-left text-[11px] text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/70',
                      employeeComboboxOpen && 'border-ring',
                    )}
                  >
                    <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      {selectedEmployees.length > 0 ? (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="truncate text-[11px] font-semibold text-foreground">
                            {selectedEmployees.length === 1
                              ? getEmployeeDisplayName(selectedEmployees[0])
                              : t('closeTimesheetPage.filters.selectedCount', {
                                  count: selectedEmployees.length,
                                })}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation()
                              setFilters((prev) => ({ ...prev, employeeIds: [] }))
                              setEmployeeSearch('')
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                event.stopPropagation()
                                setFilters((prev) => ({ ...prev, employeeIds: [] }))
                                setEmployeeSearch('')
                              }
                            }}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/80"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </div>
                      ) : (
                        <span className="block truncate whitespace-nowrap text-muted-foreground">
                          {t('closeTimesheetPage.filters.searchPlaceholder')}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                        employeeComboboxOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {employeeComboboxOpen ? (
                    <div
                      className={cn(
                        'absolute left-0 right-0 z-30 rounded-[18px] border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] backdrop-blur-xl',
                        employeeComboboxOpenUpward
                          ? 'bottom-[calc(100%+0.5rem)]'
                          : 'top-[calc(100%+0.5rem)]',
                      )}
                    >
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={employeeSearch}
                          onChange={(event) => setEmployeeSearch(event.target.value)}
                          placeholder={t('closeTimesheetPage.filters.searchPlaceholder')}
                          className="h-9 pl-8 text-xs"
                        />
                      </div>

                      <div className="mt-2 max-h-[min(16rem,calc(100vh-14rem))] space-y-2 overflow-auto pr-1">
                        {employeesLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((item) => (
                              <div
                                key={item}
                                className="h-9 w-full animate-pulse rounded-lg bg-muted/70"
                              />
                            ))}
                          </div>
                        ) : employeesError ? (
                          <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">{employeesError}</span>
                          </div>
                        ) : filteredEmployees.length ? (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleEmployeeSelection(String(emp.id))}
                              className={cn(
                                'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition',
                                filters.employeeIds.includes(String(emp.id))
                                  ? 'border-primary/60 bg-primary/10'
                                  : 'border-border/70 bg-background/70 hover:border-primary/30 hover:bg-muted/60',
                              )}
                            >
                              <UserRound
                                className={cn(
                                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                                  filters.employeeIds.includes(String(emp.id))
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-foreground">
                                  {getEmployeeDisplayName(emp)}
                                </div>
                                {emp.email ? (
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {emp.email}
                                  </div>
                                ) : null}
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
                  {selectedEmployees.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedEmployees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => toggleEmployeeSelection(String(employee.id))}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] text-primary"
                        >
                          <span className="truncate">{getEmployeeDisplayName(employee)}</span>
                          <X className="h-3 w-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex w-full gap-1.5 xl:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-md px-2.5 text-[11px] xl:min-w-[80px] xl:flex-none"
                    onClick={() => {
                      setFilters({
                        employeeIds: [],
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
                    className="h-8 flex-[1.1] rounded-md px-2.5 text-[11px] xl:min-w-[88px]"
                    onClick={() => handleSearch(1)}
                    disabled={!canSearch || loadingEntries}
                  >
                    {loadingEntries ? (
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="mr-1 h-3 w-3" />
                    )}
                    {t('closeTimesheetPage.filters.submit')}
                  </Button>
                </div>
              </div>
              </div>

              {hasSearched ? (
                <div className="space-y-4 border-t border-border/70 pt-5">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] leading-none text-muted-foreground">
                        {t('closeTimesheetPage.summary.entries')}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span className="text-lg font-semibold leading-none">{summary.totalEntries}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] leading-none text-muted-foreground">{t('closeTimesheetPage.summary.days')}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <CalendarRange className="h-3 w-3 text-primary" />
                        <span className="text-lg font-semibold leading-none">{summary.daysWithRecords}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] leading-none text-muted-foreground">
                        {t('closeTimesheetPage.summary.hours')}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Timer className="h-3 w-3 text-primary" />
                        <span className="text-lg font-semibold leading-none">{formatMinutes(summary.totalMinutes)}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-[11px] leading-none text-muted-foreground">
                        {t('closeTimesheetPage.summary.inconsistencies')}
                      </p>
                      <div className="mt-1.5 flex items-start gap-1.5 text-amber-600 dark:text-amber-100">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <div className="text-[11px] leading-4">
                          <div>{t('closeTimesheetPage.summary.pendingCount', { count: summary.pendingCount })}</div>
                          <div>{t('closeTimesheetPage.summary.duplicateCount', { count: summary.duplicateCount })}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {t('closeTimesheetPage.table.title')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('closeTimesheetPage.table.subtitle')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          exporting === 'standard' ||
                          !normalizedEntries.length ||
                          hasAppliedMultipleEmployees
                        }
                        onClick={() => exportPdf()}
                        className="h-8 rounded-md px-3 text-xs"
                        title={
                          hasAppliedMultipleEmployees
                            ? t(
                                'closeTimesheetPage.export.multipleEmployeesDescription',
                                'Selecione apenas um funcionário para exportar a folha em PDF.',
                              )
                            : undefined
                        }
                      >
                        {exporting === 'standard' ? (
                          <RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
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
                    <div className="space-y-4">
                      {hasAppliedMultipleEmployees ? (
                        groupedEntriesByEmployee.map((section) => (
                          <div
                            key={section.employeeId}
                            className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {getEmployeeDisplayName(section.employee)}
                                </p>
                                {section.employee?.email ? (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {section.employee.email}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>
                                  {section.summary.totalEntries} {t('closeTimesheetPage.summary.entries')}
                                </span>
                                <span>
                                  {section.summary.daysWithRecords} {t('closeTimesheetPage.summary.days')}
                                </span>
                                <span>
                                  {t('closeTimesheetPage.summary.hoursOnly', {
                                    count: formatWholeHours(section.summary.totalMinutes),
                                    defaultValue: '{{count}} horas',
                                  })}
                                </span>
                              </div>
                            </div>
                            {renderEntriesTable({
                              groups: section.groups,
                              tableSummary: section.summary,
                              tableDuplicatesSet: section.duplicatesSet,
                            })}
                          </div>
                        ))
                      ) : (
                        renderEntriesTable({
                          groups: groupedEntries,
                          tableSummary: summary,
                          tableDuplicatesSet: duplicatesSet,
                        })
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                        <div>
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
                            className="h-8 rounded-full px-3 text-xs"
                            disabled={currentPage <= 1 || loadingEntries}
                            onClick={() => handlePaginate('prev')}
                          >
                            {t('closeTimesheetPage.table.prev')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-3 text-xs"
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('closeTimesheetPage.delete.title', 'Excluir registro de ponto')}</DialogTitle>
            <DialogDescription>
              {t(
                'closeTimesheetPage.delete.description',
                'Tem certeza que deseja excluir este registro de ponto? Esta ação removerá o ponto das listagens e relatórios.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={Boolean(deletingEntryId)}>
                {t('common.actions.cancel', 'Cancelar')}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteTimeEntry}
              disabled={Boolean(deletingEntryId) || !deleteTarget?.timeEntryId}
            >
              {deletingEntryId
                ? t('closeTimesheetPage.delete.deleting', 'Excluindo...')
                : t('closeTimesheetPage.delete.confirm', 'Excluir')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




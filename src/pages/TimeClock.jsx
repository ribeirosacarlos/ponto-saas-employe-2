import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Clock3, HelpCircle, LogOut, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuthStore } from '../store/useAuth'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { PageContainer } from '../components/ui/PageContainer'
import { useClocking } from '../features/ponto/useClocking'
import { getWorkedToday, getOpenTimeEntryStatus, requestAdjustment } from '../services/modules/employee'
import { useAbsenceStatus } from '../features/absences/useAbsenceStatus'
import { canClockIn } from '../lib/canClockIn'
import { listEntries as listEmployeeEntries } from '../services/modules/employee'
import { getEmployeeOvertimeBalance } from '../services/modules/employees'
import { getCurrentEmployeeShift } from '../services/modules/shifts'
import { useDateTime } from '../hooks/useDateTime'
import { EntryAdjustmentModal } from '../components/EntryAdjustmentModal'

const statusTokens = {
  idle: {
    ring: 'from-slate-200 via-slate-100 to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800',
  },
  working: {
    ring: 'from-emerald-100 via-primary/25 to-emerald-200 dark:from-emerald-500/20 dark:via-primary/20 dark:to-emerald-500/10',
  },
  break: {
    ring: 'from-amber-100 via-amber-200/60 to-amber-50 dark:from-amber-500/18 dark:via-amber-500/12 dark:to-amber-400/10',
  },
  finished: {
    ring: 'from-rose-100 via-rose-200/70 to-rose-50 dark:from-rose-500/18 dark:via-rose-500/12 dark:to-rose-400/10',
  },
}

export default function TimeClock({ onContinueToDashboard }) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const {
    formatDate,
    formatTime,
    formatDateForApi,
    isSameDay,
    toCompanyZonedParts,
  } = useDateTime()
  const { toast } = useToast()
  const {
    status: clockStatus,
    registerClock,
    clocking,
    loadingEntries,
    refreshEntries,
    entries,
    todaysEntries,
    lastError,
  } = useClocking()
  const { isAbsentToday, absenceToday } = useAbsenceStatus()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [workedTodayLabel, setWorkedTodayLabel] = useState('00:00')
  const [plannedMinutes, setPlannedMinutes] = useState(null)
  const [plannedLoading, setPlannedLoading] = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState(null)
  const [overtimeLoading, setOvertimeLoading] = useState(false)
  const [recentEntries, setRecentEntries] = useState([])
  const [recentEntriesLoading, setRecentEntriesLoading] = useState(false)
  const [openEntryStatus, setOpenEntryStatus] = useState(null)
  const [submittingOpenAdjustment, setSubmittingOpenAdjustment] = useState(false)
  const userMenuRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token) return
    refreshEntries()
  }, [refreshEntries, token])

  const initials = useMemo(() => {
    const source = user?.name || user?.email || ''
    const letters = source
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
    return letters ? letters.toUpperCase() : 'P'
  }, [user])

  const firstName =
    user?.name?.trim().split(' ').filter(Boolean)[0] ||
    user?.email?.split('@')[0] ||
    t('dashboard.fallbackName')

  const employeeId = useMemo(
    () =>
      user?.employee_id ||
      user?.employeeId ||
      user?.employee?.id ||
      user?.id,
    [user],
  )

  const normalizedStatus = clockStatus || 'idle'

  const statusTitle = t(`timeClock.status.title.${normalizedStatus}`)
  const statusDescription = t(`timeClock.status.description.${normalizedStatus}`)

  const mainActionType = normalizedStatus === 'working' || normalizedStatus === 'break' ? 'out' : 'in'
  const shiftButtonLabel = t('timeClock.actions.registerPoint', 'REGISTRAR PONTO')
  const registeringLabel = t('timeClock.actions.registering')
  const primaryLoading = clocking === mainActionType

  const formattedTime = formatTime(currentTime, { hour12: false })
  const formattedDate = formatDate(currentTime, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const getEntryTimestamp = useCallback((entry) => {
    const raw = entry?.clocked_at || entry?.created_at
    const date = raw ? new Date(raw) : null
    const timestamp = date && !Number.isNaN(date.getTime()) ? date.getTime() : null
    return timestamp
  }, [])

  const formatClockedTime = useCallback(
    (value) => {
      const formatted = formatTime(value, { hour12: false })
      return formatted === '-' ? '--:--' : formatted
    },
    [formatTime],
  )

  const sortedWorkEntries = useMemo(() => {
    const workEntries = Array.isArray(entries)
      ? entries.filter((entry) => ['in', 'out'].includes(entry?.type))
      : []

    return [...workEntries].sort(
      (a, b) => (getEntryTimestamp(b) ?? 0) - (getEntryTimestamp(a) ?? 0),
    )
  }, [entries, getEntryTimestamp])

  const todayWorkEntries = useMemo(() => {
    return sortedWorkEntries.filter((entry) =>
      isSameDay(entry?.clocked_at || entry?.created_at, currentTime),
    )
  }, [currentTime, isSameDay, sortedWorkEntries])

  const lastPunch = todayWorkEntries?.[0] || null

  const lastPunchTime = useMemo(
    () => (lastPunch ? formatClockedTime(lastPunch.clocked_at || lastPunch.created_at) : null),
    [formatClockedTime, lastPunch],
  )

  const isLastPunchOpen = lastPunch?.type === 'in'

  const formatMinutesToLabel = (minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '00:00'
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }

  const punchTimelineRows = useMemo(() => {
    if (!todayWorkEntries.length) return []

    const entriesAsc = [...todayWorkEntries].sort(
      (a, b) => (getEntryTimestamp(a) ?? 0) - (getEntryTimestamp(b) ?? 0),
    )

    const segments = []

    for (let i = 0; i < entriesAsc.length; i += 1) {
      const current = entriesAsc[i]
      const next = entriesAsc[i + 1]

      if (current?.type === 'in') {
        segments.push({
          key: `work-${i}`,
          kind: 'work',
          start: current,
          end: next?.type === 'out' ? next : null,
        })
      } else if (current?.type === 'out') {
        segments.push({
          key: `break-${i}`,
          kind: 'break',
          start: current,
          end: next?.type === 'in' ? next : null,
        })
      }
    }

    const workSegments = segments.filter((segment) => segment.kind === 'work')
    const firstWork = workSegments[0]
    const lastWork = workSegments.length > 1 ? workSegments[workSegments.length - 1] : null
    const firstBreak = segments.find((segment) => segment.kind === 'break')

    const toTimeLabel = (entry) =>
      entry ? formatClockedTime(entry.clocked_at || entry.created_at) : '--:--'

    const computeDuration = (segment) => {
      if (!segment?.start) return '--:--'
      const startTs = getEntryTimestamp(segment.start)
      const endTs = segment.end ? getEntryTimestamp(segment.end) : null
      const endTime = endTs ?? currentTime.getTime()
      if (!startTs || !endTime) return '--:--'
      return formatMinutesToLabel((endTime - startTs) / 60000)
    }

    const buildRow = (segment, type) => {
      if (!segment) return null

      const hasEnd = Boolean(segment.end)
      const endLabel =
        hasEnd && segment.end
          ? toTimeLabel(segment.end)
          : segment.kind === 'work'
            ? t('timeClock.lastPunch.opened')
            : '--:--'

      const tone =
        segment.kind === 'break'
          ? 'text-primary'
          : !hasEnd && type === 'last'
            ? 'text-emerald-500 dark:text-emerald-300'
            : 'text-foreground'

      return {
        key: type,
        label: t(`timeClock.lastPunch.sections.${type}`),
        startLabel: toTimeLabel(segment.start),
        endLabel,
        duration: computeDuration(segment),
        tone,
        highlightEnd: segment.kind === 'work' && !hasEnd,
      }
    }

    return [
      buildRow(firstWork, 'first'),
      buildRow(firstBreak, 'interval'),
      buildRow(lastWork, 'last'),
    ].filter(Boolean)
  }, [
    currentTime,
    formatClockedTime,
    formatMinutesToLabel,
    getEntryTimestamp,
    t,
    todayWorkEntries,
  ])

  const formatBalanceToLabel = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '--:--'
    const rounded = Math.round(minutes)
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
    const absolute = Math.abs(rounded)
    const hours = String(Math.floor(absolute / 60)).padStart(2, '0')
    const mins = String(absolute % 60).padStart(2, '0')
    return `${sign}${hours}:${mins}`
  }, [])

  const getBalanceTone = useCallback((minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return 'text-muted-foreground'
    if (minutes > 0) return 'text-emerald-500 dark:text-emerald-300'
    if (minutes < 0) return 'text-rose-500 dark:text-rose-300'
    return 'text-foreground'
  }, [])

  const formatAbsenceDate = (value) => {
    const formatted = formatDate(value, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    return formatted === '-' ? '' : formatted
  }

  const absencePeriodLabel = useMemo(() => {
    if (!absenceToday) return ''
    const start = absenceToday.startDate || absenceToday.start_date || absenceToday.date
    const end = absenceToday.endDate || absenceToday.end_date || absenceToday.date
    if (!start && !end) return ''
    if (start && end && start !== end) {
      return `${formatAbsenceDate(start)} - ${formatAbsenceDate(end)}`
    }
    return formatAbsenceDate(start || end)
  }, [absenceToday, i18n.language])

  const absenceTypeLabel =
    absenceToday?.type_label ||
    absenceToday?.typeLabel ||
    absenceToday?.type ||
    absenceToday?.category ||
    absenceToday?.kind ||
    t('timeClock.absence.typeFallback', 'Ausencia')

  const absenceComment =
    absenceToday?.comment ||
    absenceToday?.notes ||
    absenceToday?.justification ||
    t('timeClock.absence.commentFallback', 'Sem justificativa informada.')

  const isClockBlocked = !canClockIn({ isAbsentToday })

  useEffect(() => {
    let active = true

    const fetchWorkedToday = async () => {
      if (!token) {
        setWorkedTodayLabel('00:00')
        return
      }
      try {
        const data = await getWorkedToday()
        const minutes =
          data?.workedMinutes ??
          data?.worked_minutes ??
          (data?.workedSeconds ?? data?.worked_seconds) / 60
        const label = formatMinutesToLabel(minutes)
        if (!active) return
        setWorkedTodayLabel(label)
      } catch (error) {
        console.error('[TimeClock] Failed to load worked-today', error)
        if (!active) return
        setWorkedTodayLabel('00:00')
      }
    }

    fetchWorkedToday()

    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    let active = true

    const parseTimeToMinutes = (value) => {
      if (!value || typeof value !== 'string') return null
      const [hours, minutes] = value.split(':').map((part) => Number(part))
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
      return hours * 60 + minutes
    }

    const computePlannedMinutes = (day) => {
      if (!day) return null
      if (day.is_working_day === false) return 0

      const start = parseTimeToMinutes(day.start_time ?? day.startTime ?? day.start)
      const end = parseTimeToMinutes(day.end_time ?? day.endTime ?? day.end)
      if (start === null || end === null) return null

      const breakMinutesRaw = Number(
        day.break_minutes ?? day.breakMinutes ?? day.breakDuration ?? day.break_duration ?? 0,
      )
      const breakMinutes = Number.isFinite(breakMinutesRaw) ? breakMinutesRaw : 0
      const duration = Math.max(0, end - start - breakMinutes)
      return Number.isFinite(duration) ? duration : null
    }

    const fetchPlannedShift = async () => {
      if (!token) {
        if (active) {
          setPlannedMinutes(null)
          setPlannedLoading(false)
        }
        return
      }

      setPlannedLoading(true)
      try {
        const { shift } = await getCurrentEmployeeShift()
        const today = new Date()
        const jsWeekday = today.getDay()
        const isoWeekday = jsWeekday === 0 ? 7 : jsWeekday
        const days = shift?.shift_days ?? shift?.days ?? []

        const plannedDay =
          days.find((day) => Number(day.weekday ?? day.day) === isoWeekday) ||
          days.find((day) => Number(day.weekday ?? day.day) === jsWeekday) ||
          null

        const minutes = computePlannedMinutes(plannedDay)
        if (!active) return
        setPlannedMinutes(minutes)
      } catch (error) {
        console.error('[TimeClock] Failed to load employee shift', error)
        if (!active) return
        setPlannedMinutes(null)
      } finally {
        if (active) setPlannedLoading(false)
      }
    }

    fetchPlannedShift()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    let active = true
    const fetchOpenStatus = async () => {
      if (!token) {
        setOpenEntryStatus(null)
        return
      }
      try {
        const status = await getOpenTimeEntryStatus()
        if (!active) return
        setOpenEntryStatus(status)
      } catch (error) {
        console.error('[TimeClock] Failed to load open-status', error)
      }
    }
    fetchOpenStatus()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    let active = true

    const fetchOvertimeBalance = async () => {
      if (!token || !employeeId) {
        if (active) {
          setOvertimeMinutes(null)
          setOvertimeLoading(false)
        }
        return
      }

      setOvertimeLoading(true)
      try {
        const today = new Date()
        const zonedToday = toCompanyZonedParts(today) || {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate(),
        }
        const firstDayUtc = new Date(Date.UTC(zonedToday.year, zonedToday.month - 1, 1))
        const from =
          formatDateForApi(firstDayUtc) ||
          `${zonedToday.year}-${String(zonedToday.month).padStart(2, '0')}-01`
        const to = formatDateForApi(today) || `${zonedToday.year}-${String(zonedToday.month).padStart(2, '0')}-${String(zonedToday.day).padStart(2, '0')}`
        const balance = await getEmployeeOvertimeBalance(employeeId, { from, to })

        const parseNumber = (value) => {
          if (value === null || value === undefined) return null
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : null
        }

        let minutes =
          parseNumber(balance?.balanceMinutes ?? balance?.balance_minutes) ??
          parseNumber(balance?.totalMinutes ?? balance?.total_minutes) ??
          parseNumber(balance?.minutesBalance ?? balance?.minutes_balance) ??
          parseNumber(balance?.minutes)

        if (minutes === null) {
          const seconds =
            parseNumber(
              balance?.balanceSeconds ??
                balance?.balance_seconds ??
                balance?.totalSeconds ??
                balance?.total_seconds ??
                balance?.seconds,
            ) ?? null
          if (seconds !== null) {
            minutes = seconds / 60
          }
        }

        if (minutes === null && Array.isArray(balance?.days)) {
          const total = balance.days.reduce(
            (acc, day) =>
              acc +
              (parseNumber(day?.balanceMinutes ?? day?.balance_minutes ?? day?.minutesBalance ?? day?.minutes_balance ?? day?.minutes) ??
                0),
            0,
          )
          if (Number.isFinite(total)) {
            minutes = total
          }
        }

        if (!active) return
        setOvertimeMinutes(minutes)
      } catch (error) {
        console.error('[TimeClock] Failed to load overtime balance', error)
        if (!active) return
        setOvertimeMinutes(null)
      } finally {
        if (active) setOvertimeLoading(false)
      }
    }

    fetchOvertimeBalance()
    return () => {
      active = false
    }
  }, [employeeId, token])

  const openEntryNextAction = useMemo(() => {
    const nextActionKey = openEntryStatus?.next_action
    if (!nextActionKey) return null
    return t(`timeClock.nextActions.${nextActionKey}`, {
      defaultValue: t('timeClock.nextActions.default'),
    })
  }, [openEntryStatus?.next_action, t])

  const hasOpenEntry = Boolean(openEntryStatus?.has_open_entry)

  const openEntryForAdjustment = useMemo(() => {
    if (!hasOpenEntry) return null
    return (
      openEntryStatus?.open_entry ||
      openEntryStatus?.entry ||
      todaysEntries?.[todaysEntries.length - 1] ||
      entries?.[0] ||
      null
    )
  }, [entries, hasOpenEntry, openEntryStatus?.entry, openEntryStatus?.open_entry, todaysEntries])

  const overtimeLabel = useMemo(
    () => (overtimeLoading ? t('common.loading', 'Carregando...') : formatBalanceToLabel(overtimeMinutes)),
    [formatBalanceToLabel, overtimeLoading, overtimeMinutes, t],
  )

  const overtimeTone = useMemo(
    () => (overtimeLoading ? 'text-muted-foreground' : getBalanceTone(overtimeMinutes)),
    [getBalanceTone, overtimeLoading, overtimeMinutes],
  )

  const plannedLabel = useMemo(() => {
    if (plannedLoading) return t('common.loading', 'Carregando...')
    if (plannedMinutes === null || plannedMinutes === undefined || Number.isNaN(plannedMinutes)) {
      return '--:--'
    }
    return formatMinutesToLabel(plannedMinutes)
  }, [formatMinutesToLabel, plannedLoading, plannedMinutes, t])

  const plannedTone = plannedLoading ? 'text-muted-foreground' : 'text-foreground'

  const summaryStats = useMemo(
    () => [
      { label: t('timeClock.summary.planned'), value: plannedLabel, tone: plannedTone },
      {
        label: t('timeClock.summary.recorded'),
        value: workedTodayLabel,
        tone:
          normalizedStatus === 'idle'
            ? 'text-muted-foreground'
            : 'text-emerald-500 dark:text-emerald-300',
      },
      { label: t('timeClock.summary.bank'), value: overtimeLabel, tone: overtimeTone },
    ],
    [normalizedStatus, overtimeLabel, overtimeTone, plannedLabel, plannedTone, t, workedTodayLabel],
  )

  const handleOpenEntryAdjustment = async (payload, closeModal, resetForm) => {
    const idKey = payload.entry_id || payload.original_time || 'open-entry'
    setSubmittingOpenAdjustment(idKey)
    try {
      await requestAdjustment(payload)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal?.()
      resetForm?.()
    } catch (error) {
      toast({
        title: t('historyPage.adjustment.errorTitle'),
        description:
          error.response?.data?.message || error.message || t('historyPage.adjustment.errorDescription'),
        variant: 'error',
      })
    } finally {
      setSubmittingOpenAdjustment(false)
    }
  }

  const normalizeEntryList = useCallback(
    (items = []) => {
      const sorted = [...items]
        .filter((entry) => entry?.clocked_at)
        .sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime())

      return sorted.slice(0, 3).map((entry) => {
        const date = new Date(entry.clocked_at)
        const day = formatDate(date, {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
        })
        const timeLabel = formatClockedTime(entry.clocked_at)
        const typeKey =
          entry.type === 'in'
            ? 'in'
            : entry.type === 'out'
              ? 'out'
              : entry.type === 'break_start'
                ? 'breakStart'
                : entry.type === 'break_end'
                  ? 'breakEnd'
                  : entry.type
        const typeLabel =
          t(`types.${typeKey}`) ||
          (typeKey === 'breakStart'
            ? t('timeClock.recent.breakStart', 'Início do intervalo')
            : typeKey === 'breakEnd'
              ? t('timeClock.recent.breakEnd', 'Fim do intervalo')
              : entry.type)
        const tone =
          entry.type === 'in'
            ? 'text-emerald-500 dark:text-emerald-300'
            : entry.type === 'out'
              ? 'text-amber-500 dark:text-amber-300'
              : 'text-muted-foreground'

        return {
          id: entry.id || `${entry.clocked_at}-${entry.type}`,
          day,
          interval: `${typeLabel} • ${timeLabel}`,
          value: entry.source || entry.type,
          tone,
        }
      })
    },
    [formatClockedTime, i18n.language, t],
  )

  const fetchRecentEntries = useCallback(async () => {
    if (!token) {
      if (isMounted.current) setRecentEntries([])
      return
    }

    if (isMounted.current) setRecentEntriesLoading(true)
    try {
      const { data } = await listEmployeeEntries(1)
      const normalized = Array.isArray(data) ? data : data?.data || []
      if (isMounted.current) setRecentEntries(normalizeEntryList(normalized))
    } catch (error) {
      console.error('[TimeClock] Failed to load recent entries', error)
      if (isMounted.current) setRecentEntries([])
    } finally {
      if (isMounted.current) setRecentEntriesLoading(false)
    }
  }, [normalizeEntryList, token])

  useEffect(() => {
    fetchRecentEntries()
  }, [fetchRecentEntries])

  const handleGoToDashboard = () => {
    if (onContinueToDashboard) {
      onContinueToDashboard()
      return
    }
    window.location.href = '/dashboard'
  }

  const handlePrimaryAction = async () => {
    if (isClockBlocked) {
      toast({
        title: t('timeClock.absence.blockTitle', 'Registro bloqueado'),
        description: t(
          'timeClock.absence.blockDescription',
          'Voce esta em ausencia hoje e nao pode registrar o ponto.',
        ),
        variant: 'error',
      })
      return
    }
    await registerClock(mainActionType)
    await fetchRecentEntries()
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    await logout()
    setLogoutLoading(false)
    setIsUserMenuOpen(false)
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false)
    window.location.href = '/profile'
  }

  const handleOpenHelp = () => {
    setIsUserMenuOpen(false)
    window.location.href = '/help'
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => {
    isMounted.current = false
  }, [])

  return (
    <PageContainer className="flex min-h-screen items-center justify-center">
      <div className="
        relative w-full max-w-6x1 overflow-hidden
        rounded-[28px] sm:rounded-[32px]
        border border-border/80
        bg-gradient-to-br from-background/95 via-card/95 to-background/95
        p-4 sm:p-6 lg:p-8
        shadow-[0_60px_120px_-70px_rgba(62,82,152,0.55)]
        backdrop-blur-xl
      ">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[-14%] top-[-18%] h-72 w-72 rounded-full bg-primary/18 blur-[120px]" />
          <div className="absolute right-[-18%] top-[10%] h-80 w-80 rounded-full bg-primary/16 blur-[120px]" />
          <div className="absolute bottom-[-18%] left-[26%] h-72 w-72 rounded-full bg-indigo-400/14 blur-[120px] dark:bg-indigo-500/14" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="grid gap-4 lg:flex lg:items-start lg:justify-between">
            <div className="order-2 lg:order-1">
              <div className="flex items-start gap-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t('timeClock.greeting', { name: firstName })}
                  </p>
                  <div className="space-y-1">
                    <h1 className="text-3xl font-semibold leading-tight">{t('timeClock.title')}</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">{t('timeClock.subtitle')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="flex flex-col gap-2 lg:items-end">
                <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-2 shadow-[0_16px_50px_-42px_rgba(62,82,152,0.35)] backdrop-blur lg:w-auto lg:justify-start lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
                  <div className="min-w-0 leading-tight lg:text-right">
                    <p className="truncate text-xs font-semibold text-muted-foreground lg:text-sm">
                      {formattedDate}
                    </p>
                    <p className="text-base font-bold text-foreground lg:text-lg">
                      {formattedTime}
                    </p>
                  </div>

                  <div ref={userMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 lg:h-12 lg:w-12 lg:text-sm"
                      aria-haspopup="menu"
                      aria-expanded={isUserMenuOpen}
                    >
                      {initials}
                    </button>

                    {isUserMenuOpen ? (
                      <div className="absolute right-0 top-12 w-64 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.45)] backdrop-blur lg:top-14">
                        {/* ...seu menu igual... */}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 rounded-[26px] border border-border/80 bg-card/95 p-6 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.45)]">
              {isAbsentToday ? (
                <div className="rounded-2xl border border-rose-200/70 bg-rose-500/10 p-4 shadow-[0_16px_40px_-30px_rgba(244,63,94,0.35)] dark:border-rose-400/30 dark:bg-rose-500/10">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-100">
                        {t('timeClock.absence.bannerTitle', 'Voce esta em ausencia hoje:')}{' '}
                        {absenceTypeLabel}
                      </p>
                      {absencePeriodLabel ? (
                        <p className="text-xs text-rose-600/90 dark:text-rose-100/80">
                          {t('timeClock.absence.periodLabel', 'Periodo:')} {absencePeriodLabel}
                        </p>
                      ) : null}
                      <p className="text-xs text-rose-600/90 dark:text-rose-100/80">
                        {t('timeClock.absence.reasonLabel', 'Motivo:')} {absenceComment}
                      </p>
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-100">
                        {t(
                          'timeClock.absence.blockedLabel',
                          'Voce esta bloqueado para registrar o ponto.',
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {hasOpenEntry ? (
                <EntryAdjustmentModal
                  entry={openEntryForAdjustment}
                  defaultDate={new Date()}
                  hideOriginalTime
                  onSubmit={handleOpenEntryAdjustment}
                  isSubmitting={Boolean(submittingOpenAdjustment)}
                  trigger={
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-rose-700/70 bg-rose-600 p-4 text-left text-white shadow-[0_18px_48px_-24px_rgba(190,24,93,0.55)] transition hover:shadow-[0_24px_62px_-28px_rgba(190,24,93,0.6)] focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-rose-600 dark:border-rose-400/60 dark:bg-rose-500"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center text-white">
                          <AlertTriangle className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold leading-tight">
                            {t('timeClock.openEntryWarning.title', 'Ponto em aberto')}
                          </p>
                          <p className="text-[13px] leading-snug text-rose-50">
                            {t(
                              'timeClock.openEntryWarning.description',
                              'Existe um registro em aberto que precisa ser finalizado para regularizar seu dia.',
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  }
                />
              ) : null}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {t('timeClock.status.label.heading', 'Status atual')}
                  </p>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-semibold leading-tight">{statusTitle}</h3>
                    <p className="text-sm text-muted-foreground">{statusDescription}</p>
                  </div>
                </div>
                <div className="relative h-28 w-28">
                  <div className={cn('absolute inset-0 rounded-full bg-gradient-to-br', statusTokens[normalizedStatus]?.ring)} />
                  <div className="absolute inset-[10px] rounded-full border border-border/80 bg-card shadow-inner" />
                  <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-background/85 text-center text-xs font-semibold shadow-sm backdrop-blur dark:bg-card/75">
                    <span className="uppercase tracking-[0.18em] text-muted-foreground">
                      {t('timeClock.summary.todayBadge', 'Hoje')}
                    </span>
                    <span className="text-lg font-semibold text-foreground">{workedTodayLabel}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/85 px-4 py-4 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock3 className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {t('timeClock.lastPunch.title')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lastPunchTime
                            ? t('timeClock.lastPunch.registeredAt', { time: lastPunchTime })
                            : t('timeClock.lastPunch.none')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {punchTimelineRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('timeClock.lastPunch.none')}</p>
                  ) : (
                    <div className="space-y-2">
                      {punchTimelineRows.map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-3 py-3"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-foreground">{row.label}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{row.startLabel}</span>
                              <span className="text-muted-foreground/60">{'>'}</span>
                              <span
                                className={cn(
                                  'text-foreground',
                                  row.highlightEnd ? 'font-semibold text-primary' : 'text-foreground',
                                )}
                              >
                                {row.endLabel}
                              </span>
                            </div>
                          </div>
                          <span className={cn('text-sm font-bold', row.tone)}>{row.duration}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  disabled={primaryLoading || loadingEntries || isClockBlocked}
                  onClick={handlePrimaryAction}
                  className="h-12 w-full rounded-full shadow-[0_16px_40px_-24px_rgba(62,82,152,0.55)]"
                >
                  {primaryLoading ? registeringLabel : shiftButtonLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGoToDashboard}
                  className="h-12 w-full rounded-full border border-border bg-background/80 text-foreground shadow-[0_12px_22px_-18px_rgba(62,82,152,0.35)]"
                >
                  {t('timeClock.actions.goDashboard')}
                </Button>
              </div>
              {lastError ? (
                <p className="text-xs font-semibold text-rose-500 sm:text-sm">{lastError}</p>
              ) : null}
            </div>

            <div className="space-y-4 rounded-[26px]">
              <div className="rounded-[24px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-54px_rgba(62,82,152,0.4)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t('timeClock.summary.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('timeClock.summary.subtitle')}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t('timeClock.summary.todayBadge', 'Hoje')}
                  </span>
                </div>
                <div className="space-y-2">
                  {summaryStats.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-3 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.22)]"
                    >
                      <span className="text-sm font-semibold text-muted-foreground">{item.label}</span>
                      <span className={cn('text-sm font-bold', item.tone)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-54px_rgba(62,82,152,0.4)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">{t('timeClock.recent.title')}</p>
                  <button className="text-xs font-semibold text-primary hover:underline">
                    {t('timeClock.recent.viewAll')}
                  </button>
                </div>
                <div className="space-y-3">
                  {recentEntriesLoading ? (
                    <p className="text-xs text-muted-foreground">
                      {t('common.loading', 'Carregando registros...')}
                    </p>
                  ) : recentEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('timeClock.recent.empty', 'Nenhum registro encontrado.')}
                    </p>
                  ) : (
                    recentEntries.map((entry) => (
                      <div
                        key={entry.id || entry.day + entry.value}
                        className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-3 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.22)]"
                      >
                        <div>
                          <p className="text-sm font-semibold">{entry.day}</p>
                          <p className="text-xs text-muted-foreground">{entry.interval}</p>
                        </div>
                        <span className={cn('text-sm font-bold', entry.tone)}>{entry.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/85 px-4 py-3 text-xs text-muted-foreground shadow-[0_12px_24px_-20px_rgba(0,0,0,0.22)] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{t('timeClock.syncedMessage')}</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-primary">{t('timeClock.help')}</button>
              <span className="text-border">|</span>
              <button className="hover:text-primary">{t('timeClock.preferences')}</button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

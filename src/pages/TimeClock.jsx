import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Clock3, HelpCircle, LogOut, Menu, User, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuthStore } from '../store/useAuth'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { useClocking } from '../features/ponto/useClocking'
import { getWorkedToday } from '../lib/api'
import { useAbsenceStatus } from '../features/absences/useAbsenceStatus'
import { canClockIn } from '../lib/canClockIn'

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

export default function TimeClock({ onContinueToDashboard, sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const {
    status: clockStatus,
    registerClock,
    clocking,
    loadingEntries,
    refreshEntries,
    lastWorkEntry,
    lastError,
  } = useClocking()
  const { isAbsentToday, absenceToday } = useAbsenceStatus()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [workedTodayLabel, setWorkedTodayLabel] = useState('00:00')
  const userMenuRef = useRef(null)

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

  const normalizedStatus = clockStatus || 'idle'

  const statusTitle = t(`timeClock.status.title.${normalizedStatus}`)
  const statusDescription = t(`timeClock.status.description.${normalizedStatus}`)

  const mainActionType = normalizedStatus === 'working' || normalizedStatus === 'break' ? 'out' : 'in'
  const shiftButtonLabel = t('timeClock.actions.registerPoint', 'REGISTRAR PONTO')
  const registeringLabel = t('timeClock.actions.registering')
  const primaryLoading = clocking === mainActionType

  const formattedTime = format(currentTime, 'HH:mm')
  const formattedDate = currentTime.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const lastRecordLabel = lastWorkEntry
    ? t('timeClock.lastRecord.label', {
        type: t(`types.${lastWorkEntry.type === 'in' ? 'in' : 'out'}`),
        time: format(new Date(lastWorkEntry.clocked_at), 'HH:mm'),
      })
    : t('timeClock.lastRecord.placeholder')

  const formatRecentDay = (offset = 0) => {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
  }

  const formatRecentInterval = (start, end) =>
    t('timeClock.recent.interval', {
      entryLabel: t('timeClock.recent.entryLabel'),
      exitLabel: t('timeClock.recent.exitLabel'),
      start,
      end,
    })

  const formatMinutesToLabel = (minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '00:00'
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }

  const formatAbsenceDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
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
        console.log('[TimeClock] worked-today response:', data)
        const minutes =
          data?.workedMinutes ??
          data?.worked_minutes ??
          (data?.workedSeconds ?? data?.worked_seconds) / 60
        const label = formatMinutesToLabel(minutes)
        console.log('[TimeClock] computed label:', { minutes, label })
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

  const summaryStats = useMemo(
    () => [
      { label: t('timeClock.summary.planned'), value: '08:00', tone: 'text-foreground' },
      {
        label: t('timeClock.summary.recorded'),
        value: workedTodayLabel,
        tone:
          normalizedStatus === 'idle'
            ? 'text-muted-foreground'
            : 'text-emerald-500 dark:text-emerald-300',
      },
      { label: t('timeClock.summary.bank'), value: '+02:15', tone: 'text-emerald-500 dark:text-emerald-300' },
    ],
    [normalizedStatus, t],
  )

  const recentEntries = useMemo(
    () => [
      {
        day: formatRecentDay(1),
        interval: formatRecentInterval('09:02', '17:36'),
        value: '08:34',
        tone: 'text-emerald-500 dark:text-emerald-300',
      },
      {
        day: formatRecentDay(2),
        interval: formatRecentInterval('09:11', '17:21'),
        value: '08:10',
        tone: 'text-emerald-500 dark:text-emerald-300',
      },
      {
        day: formatRecentDay(3),
        interval: formatRecentInterval('08:59', '16:45'),
        value: '07:46',
        tone: 'text-amber-500 dark:text-amber-300',
      },
    ],
    [i18n.language, t],
  )

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

  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[32px] border border-border/80 bg-gradient-to-br from-background/95 via-card/95 to-background/95 p-8 shadow-[0_60px_120px_-70px_rgba(62,82,152,0.55)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[-14%] top-[-18%] h-72 w-72 rounded-full bg-primary/18 blur-[120px]" />
          <div className="absolute right-[-18%] top-[10%] h-80 w-80 rounded-full bg-primary/16 blur-[120px]" />
          <div className="absolute bottom-[-18%] left-[26%] h-72 w-72 rounded-full bg-indigo-400/14 blur-[120px] dark:bg-indigo-500/14" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label={t('dashboardPage.header.toggleMenu')}
                onClick={onToggleSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80 md:h-10 md:w-10"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
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
            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex items-center gap-3">
                <div className="text-right leading-tight">
                  <p className="text-sm font-semibold text-muted-foreground">{formattedDate}</p>
                  <p className="text-lg font-bold text-foreground">{formattedTime}</p>
                </div>
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                  >
                    {initials}
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-14 w-64 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.45)] backdrop-blur">
                      <div className="flex items-center gap-3 rounded-xl bg-muted/70 px-3 py-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {user?.name || firstName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user?.email || t('dashboard.fallbackEmail', 'usuario@empresa.com')}
                          </p>
                        </div>
                      </div>

                      <div className="my-3 h-px bg-border/80" />

                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={handleGoToProfile}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </span>
                          {t('timeClock.menu.profile', 'Perfil do técnico')}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenHelp}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <HelpCircle className="h-4 w-4" />
                          </span>
                          {t('timeClock.menu.help', 'Solicitar ajuda')}
                        </button>
                        <button
                          type="button"
                          disabled={logoutLoading}
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                            <LogOut className="h-4 w-4" />
                          </span>
                          {t('timeClock.actions.logout')}
                        </button>
                      </div>
                    </div>
                  ) : null}
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

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-3 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t('timeClock.lastRecord.title')}</p>
                    <p className="text-xs text-muted-foreground">{lastRecordLabel}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.day + entry.value}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-4 py-3 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.22)]"
                    >
                      <div>
                        <p className="text-sm font-semibold">{entry.day}</p>
                        <p className="text-xs text-muted-foreground">{entry.interval}</p>
                      </div>
                      <span className={cn('text-sm font-bold', entry.tone)}>{entry.value}</span>
                    </div>
                  ))}
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
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock3, LogOut } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAuthStore } from '../store/useAuth'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useClocking } from '../features/ponto/useClocking'

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
  const { toast } = useToast()
  const {
    status: clockStatus,
    isOnBreak,
    registerClock,
    registerBreak,
    clocking,
    breakLoading,
    loadingEntries,
    refreshEntries,
    lastWorkEntry,
    lastError,
  } = useClocking()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [logoutLoading, setLogoutLoading] = useState(false)

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

  const statusTitle = {
    idle: t('timeClock.status.title.idle', 'Sem registrar'),
    working: t('timeClock.status.title.working', 'Trabalhando'),
    break: t('timeClock.status.title.break', 'Em intervalo'),
    finished: t('timeClock.status.title.finished', 'Dia finalizado'),
  }[clockStatus]

  const statusDescription = {
    idle: t('timeClock.status.description.idle', 'Voce ainda nao registrou sua entrada hoje.'),
    working: t(
      'timeClock.status.description.working',
      'Turno ativo. Registre pausas ou saida quando finalizar.',
    ),
    break: t(
      'timeClock.status.description.break',
      'Intervalo em andamento. Volte quando estiver pronto.',
    ),
    finished: t(
      'timeClock.status.description.finished',
      'Dia concluido. Registre uma nova entrada amanha.',
    ),
  }[clockStatus]

  const mainActionType = clockStatus === 'working' || clockStatus === 'break' ? 'out' : 'in'
  const shiftButtonLabel = mainActionType === 'in' ? 'Registrar entrada' : 'Registrar saída'
  const breakButtonLabel = isOnBreak ? 'Voltar do intervalo' : 'Iniciar intervalo'
  const primaryLoading = clocking === mainActionType

  const formattedTime = format(currentTime, 'HH:mm')
  const formattedDate = currentTime.toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const lastRecordLabel = lastWorkEntry
    ? `${lastWorkEntry.type === 'in' ? 'Entrada' : 'Saída'} às ${format(
        new Date(lastWorkEntry.clocked_at),
        'HH:mm',
      )}`
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

  const summaryStats = useMemo(
    () => [
      { label: t('timeClock.summary.planned'), value: '08:00', tone: 'text-foreground' },
      {
        label: t('timeClock.summary.recorded'),
        value:
          clockStatus === 'idle'
            ? '00:00'
            : clockStatus === 'working' || clockStatus === 'break'
              ? '02:45'
              : '08:00',
        tone:
          clockStatus === 'idle'
            ? 'text-muted-foreground'
            : 'text-emerald-500 dark:text-emerald-300',
      },
      { label: t('timeClock.summary.bank'), value: '+02:15', tone: 'text-emerald-500 dark:text-emerald-300' },
    ],
    [clockStatus, t],
  )

  const recentEntries = useMemo(
    () => [
      {
        day: formatRecentDay(1),
        interval: `${t('timeClock.recent.entryLabel')} 09:02 às ${t('timeClock.recent.exitLabel')} 17:36`,
        value: '08:34',
        tone: 'text-emerald-500 dark:text-emerald-300',
      },
      {
        day: formatRecentDay(2),
        interval: `${t('timeClock.recent.entryLabel')} 09:11 às ${t('timeClock.recent.exitLabel')} 17:21`,
        value: '08:10',
        tone: 'text-emerald-500 dark:text-emerald-300',
      },
      {
        day: formatRecentDay(3),
        interval: `${t('timeClock.recent.entryLabel')} 08:59 às ${t('timeClock.recent.exitLabel')} 16:45`,
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
    await registerClock(mainActionType)
  }

  const handleBreakToggle = async () => {
    if (clockStatus === 'idle' || clockStatus === 'finished') {
      toast({
        title: 'Registre entrada antes do intervalo',
        description: 'Inicie sua jornada para abrir um intervalo.',
        variant: 'error',
      })
      return
    }
    await registerBreak(isOnBreak ? 'end' : 'start')
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    await logout()
    setLogoutLoading(false)
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[32px] border border-border/80 bg-card/95 p-8 shadow-[0_60px_120px_-70px_rgba(62,82,152,0.55)] backdrop-blur-xl dark:from-[#0c1222]/95 dark:via-primary/12 dark:to-[#0b1020]/95">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[-14%] top-[-18%] h-72 w-72 rounded-full bg-primary/18 blur-[120px]" />
          <div className="absolute right-[-18%] top-[10%] h-80 w-80 rounded-full bg-[#9ad5ff]/14 blur-[120px]" />
          <div className="absolute bottom-[-18%] left-[26%] h-72 w-72 rounded-full bg-[#7b8fff]/14 blur-[120px]" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('timeClock.greeting', { name: firstName })}
              </p>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold leading-tight">{t('timeClock.title')}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{t('timeClock.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex items-center justify-end gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right leading-tight">
                  <p className="text-sm font-semibold text-muted-foreground">{formattedDate}</p>
                  <p className="text-lg font-bold text-foreground">{formattedTime}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]">
                  {initials}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 rounded-[26px] border border-border/80 bg-card/95 p-6 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.45)]">
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
                  <div className={cn('absolute inset-0 rounded-full bg-gradient-to-br', statusTokens[clockStatus]?.ring)} />
                  <div className="absolute inset-[10px] rounded-full border border-border/80 bg-card shadow-inner" />
                  <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white/80 text-center text-xs font-semibold shadow-sm backdrop-blur dark:bg-slate-900/70">
                    <span className="uppercase tracking-[0.18em] text-muted-foreground">
                      {t('timeClock.summary.todayBadge', 'Hoje')}
                    </span>
                    <span className="text-lg font-semibold text-foreground">00:00</span>
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
                  disabled={primaryLoading || loadingEntries}
                  onClick={handlePrimaryAction}
                  className="h-12 w-full rounded-full border border-primary/25 bg-gradient-to-r from-[#2d3b87] via-[#2c2f71] to-[#2a2c5f] text-white shadow-[0_16px_40px_-24px_rgba(45,59,135,0.55)]"
                >
                  {primaryLoading ? 'Registrando...' : shiftButtonLabel}
                </Button>
                <Button
                  variant="secondary"
                  disabled={breakLoading || loadingEntries || clockStatus === 'idle' || clockStatus === 'finished'}
                  onClick={handleBreakToggle}
                  className="h-12 w-full rounded-full border border-border/80 bg-muted text-foreground shadow-[0_12px_22px_-18px_rgba(0,0,0,0.28)]"
                >
                  {breakLoading ? 'Registrando...' : breakButtonLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGoToDashboard}
                  className="h-12 w-full rounded-full border border-border/80 bg-white text-foreground shadow-[0_12px_22px_-18px_rgba(0,0,0,0.28)] dark:bg-slate-900/70"
                >
                  {t('timeClock.actions.goDashboard')}
                </Button>
                <Button
                  variant="outline"
                  disabled={logoutLoading}
                  onClick={handleLogout}
                  className="h-12 w-full rounded-full border border-border/80 bg-background text-foreground shadow-[0_10px_22px_-18px_rgba(0,0,0,0.26)]"
                >
                  <LogOut className="h-4 w-4" />
                  {t('timeClock.actions.logout')}
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

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { AjusteModal } from '../../components/AjusteModal'
import { getWorkedToday } from '../../services/modules/employee'
import { useAuthStore } from '../../store/useAuth'
import { useDateTime } from '../../hooks/useDateTime'

export function PunchSummaryCard({
  t,
  lastPunch,
  dayRows,
  workedTime,
  hourBank,
  nextType = 'in',
  sendingAdjustment,
  onAdjustment,
  entries = [],
}) {
  const token = useAuthStore((state) => state.token)
  const { formatTime } = useDateTime()
  const [showDetails, setShowDetails] = useState(false)
  const [workedTodayLabel, setWorkedTodayLabel] = useState(workedTime || '--:--')

  const formatClockedTime = (value) => {
    const formatted = formatTime(value, { hour12: false })
    return formatted === '-' ? '--:--' : formatted
  return format(date, 'HH:mm')
  }

  const formatMinutesToLabel = (minutes) => {
    if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '--:--'
    const totalMinutes = Math.max(0, Math.round(minutes))
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mins = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${mins}`
  }

  useEffect(() => {
    let active = true

    const fetchWorkedToday = async () => {
      if (!token) {
        setWorkedTodayLabel(workedTime || '--:--')
        return
      }
      try {
        const data = await getWorkedToday()
        const minutes =
          data?.workedMinutes ??
          data?.worked_minutes ??
          (data?.workedSeconds ?? data?.worked_seconds) / 60
        if (!active) return
        setWorkedTodayLabel(formatMinutesToLabel(minutes))
      } catch (error) {
        console.error('Failed to load worked-today summary', error)
        if (!active) return
        setWorkedTodayLabel(workedTime || '--:--')
      }
    }

    fetchWorkedToday()

    return () => {
      active = false
    }
  }, [token, workedTime])

  useEffect(() => {
    console.log('[PunchSummaryCard] lastPunch clocked_at:', {
      raw: lastPunch?.clocked_at,
      formatted: formatClockedTime(lastPunch?.clocked_at),
      type: lastPunch?.type,
    })

    console.log(
      '[PunchSummaryCard] dayRows times:',
      dayRows.map((row) => ({
        label: row.label,
        startRaw: row.start,
        start: formatClockedTime(row.start),
        endRaw: row.end,
        end: formatClockedTime(row.end),
        duration: row.duration,
        open: row.open,
      })),
    )
  }, [dayRows, lastPunch])

  return (
    <Card className="relative overflow-hidden bg-card/90">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-10%] top-[-18%] h-40 w-40 rounded-full bg-primary/20 blur-[90px]" />
        <div className="absolute right-[-12%] top-[10%] h-48 w-48 rounded-full bg-primary/16 blur-[120px]" />
      </div>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
              {t('dashboard.sectionLabel')}
            </p>
            <CardTitle className="text-xl">{t('dashboard.myPoint')}</CardTitle>
            <p className="text-sm text-foreground/70">{t('dashboard.description')}</p>
          </div>
          <AjusteModal
            entries={entries}
            onSubmit={onAdjustment}
            isSubmitting={sendingAdjustment}
            trigger={
              <Button size="sm" variant="outline" className="rounded-full px-3 text-xs">
                {t('dashboard.requestAdjustment')}
              </Button>
            }
          />
        </div>

        <div className="rounded-3xl border border-border/70 bg-gradient-to-r from-primary/12 via-primary/12 to-transparent p-4 shadow-[0_24px_70px_-40px_rgba(92,134,255,0.55)] backdrop-blur-lg">
          <div className="flex flex-col gap-3 rounded-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/20">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t('dashboard.lastPunch')}</p>
                  <p className="text-xs text-foreground/70">
                    {lastPunch?.clocked_at
                      ? t('dashboard.registeredAt', {
                          time: formatClockedTime(lastPunch.clocked_at),
                        })
                      : t('dashboard.lastPunchFallback')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-transparent px-4 text-xs font-semibold text-primary hover:border-border"
                onClick={() => setShowDetails((prev) => !prev)}
                aria-expanded={showDetails}
                aria-controls="day-history"
              >
                {t('dashboard.details')}
                {showDetails ? (
                  <ChevronUp className="ml-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </Button>
            </div>

            {showDetails && (
              <div id="day-history" className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-3">
                {dayRows.length === 0 ? (
                  <p className="text-xs text-foreground/70">{t('dashboard.noEntriesToday')}</p>
                ) : (
                  (() => {
                    const lastRow = dayRows[dayRows.length - 1]
                    const openRow = dayRows.find((row) => row.open)
                    const punchTime = lastPunch?.clocked_at
                      ? formatClockedTime(lastPunch.clocked_at)
                      : '--:--'
                    const duration = (openRow || lastRow)?.duration || '--:--'
                    const isOpen = Boolean(openRow)

                    return (
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-[0_14px_40px_-32px_rgba(92,134,255,0.45)]">
                        <div>
                          <p className="text-sm font-semibold">{t('dashboard.lastPunchRow')}</p>
                          <p className="flex items-center gap-2 text-xs text-foreground/70">
                            <span>{punchTime}</span>
                            {isOpen ? (
                              <>
                                <span className="text-muted-foreground/60">{'>'}</span>
                                <span className="font-semibold text-primary">{t('dashboard.openStatus')}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary">{duration}</span>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_18px_50px_-35px_rgba(92,134,255,0.35)]">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('dashboard.hoursToday')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{workedTodayLabel}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.hoursTodayHelper')}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_18px_50px_-35px_rgba(92,134,255,0.35)]">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('dashboard.hourBank')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">{hourBank}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.hourBankHelper')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/12 via-primary/12 to-transparent px-4 py-3 text-xs text-foreground/75 shadow-inner shadow-primary/10">
          {t('dashboard.backendNote', {
            inLabel: 'in',
            outLabel: 'out',
            nextType: nextType?.toUpperCase?.() || 'IN',
          })}
        </div>
      </CardContent>
    </Card>
  )
}

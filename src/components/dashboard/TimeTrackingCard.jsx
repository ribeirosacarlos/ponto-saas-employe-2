import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Clock3 } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import { Button } from '../ui/button'
import { AjusteModal } from '../AjusteModal'
import { useClocking } from '../../features/ponto/useClocking'
import { requestAdjustment } from '../../lib/api'
import { useAuthStore } from '../../store/useAuth'

const statusTone = {
  normal:
    'border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
  extra:
    'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
  late:
    'border-rose-200/80 bg-rose-500/12 text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-100',
}

export function TimeTrackingCard({ onOpenHistory }) {
  const token = useAuthStore((state) => state.token)
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { entries, loadingEntries, refreshEntries } = useClocking()
  const [sendingAdjustment, setSendingAdjustment] = useState(false)

  useEffect(() => {
    if (!token) return
    refreshEntries()
  }, [refreshEntries, token])

  const todaysEntries = useMemo(
    () => entries.filter((entry) => entry.clocked_at && isSameDay(new Date(entry.clocked_at), new Date())),
    [entries],
  )

  const daySummaries = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      if (!entry.clocked_at) return acc
      const key = format(new Date(entry.clocked_at), 'yyyy-MM-dd')
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([dateKey, items]) => {
        const sorted = [...items].sort(
          (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
        )
        let firstIn = null
        let lastOut = null
        let lastIn = null
        let totalMs = 0

        sorted.forEach((item) => {
          const ts = new Date(item.clocked_at).getTime()
          if (item.type === 'in') {
            lastIn = ts
            if (!firstIn) firstIn = ts
          } else if (item.type === 'out' && lastIn) {
            totalMs += ts - lastIn
            lastOut = ts
            lastIn = null
          }
        })

        const totalMinutes = Math.max(0, Math.round(totalMs / 60000))
        const status = totalMinutes >= 540 ? 'extra' : totalMinutes >= 480 ? 'normal' : 'late'

        return { dateKey, firstIn, lastOut, totalMinutes, status }
      })
      .sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime())
  }, [entries])

  const recentDays = useMemo(() => daySummaries.slice(0, 3), [daySummaries])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    let totalMinutes = 0
    let workedDays = 0

    daySummaries.forEach((day) => {
      const current = new Date(day.dateKey)
      if (current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear()) {
        totalMinutes += day.totalMinutes
        workedDays += 1
      }
    })

    const expectedMinutes = workedDays * 8 * 60
    const extraMinutes = Math.max(0, totalMinutes - expectedMinutes)

    return {
      totalHoursLabel: `${Math.round(totalMinutes / 60)}h`,
      extraHoursLabel: `${Math.round(extraMinutes / 60)}h`,
    }
  }, [daySummaries])

  const formatDuration = (minutes) => {
    const hrs = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mins = String(minutes % 60).padStart(2, '0')
    return `${hrs}:${mins}`
  }

  const formatDayLabel = (dateKey) => {
    const label = new Date(dateKey).toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    try {
      await requestAdjustment(form)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal()
      resetForm()
    } catch (error) {
      toast({
        title: t('toast.adjustmentError.title'),
        description: error.response?.data?.message || t('toast.adjustmentError.description'),
        variant: 'error',
      })
    } finally {
      setSendingAdjustment(false)
    }
  }

  const handleViewFullHistory = () => {
    if (onOpenHistory) {
      onOpenHistory()
    } else {
      toast({
        title: t('dashboardPage.toasts.fullHistory.title'),
        description: t('dashboardPage.toasts.fullHistory.description'),
      })
    }
  }

  return (
    <section className="flex h-full flex-col gap-3 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5 sm:gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
            {t('dashboardPage.timeTracking.tag')}
          </p>
          <h2 className="text-sm font-semibold">{t('dashboardPage.timeTracking.title')}</h2>
          <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
            {t('dashboardPage.timeTracking.subtitle', {
              total: monthlyStats.totalHoursLabel,
              extra: monthlyStats.extraHoursLabel,
            })}
          </p>
        </div>
      </header>

      <div className="space-y-2 text-[11px] sm:text-[12px]">
        {loadingEntries && (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 rounded-2xl border border-border/40 bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}
        {!loadingEntries && recentDays.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('dashboardPage.timeTracking.empty')}</p>
        )}
        {!loadingEntries &&
          recentDays.map((day) => (
            <div
              key={day.dateKey}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/70 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">{formatDayLabel(day.dateKey)}</span>
                <span className="text-muted-foreground">
                  {t('dashboardPage.timeTracking.interval', {
                    entryLabel: t('dashboardPage.timeTracking.entryLabel'),
                    exitLabel: t('dashboardPage.timeTracking.exitLabel'),
                    start: day.firstIn ? format(new Date(day.firstIn), 'HH:mm') : '--:--',
                    end: day.lastOut ? format(new Date(day.lastOut), 'HH:mm') : '--:--',
                  })}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-semibold sm:text-[11px]">
                  {formatDuration(day.totalMinutes)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-medium ${statusTone[day.status]}`}
                >
                  {t(`dashboardPage.timeTracking.status.${day.status}`)}
                </span>
              </div>
            </div>
          ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleViewFullHistory}
          className="h-10 rounded-full border-border bg-background/80 px-3 text-[11px] font-semibold sm:text-xs"
        >
          <Clock3 className="h-4 w-4 text-primary" />
          {t('dashboardPage.timeTracking.actions.fullHistory')}
        </Button>
        <AjusteModal
          onSubmit={handleAdjustment}
          isSubmitting={sendingAdjustment}
          trigger={
            <Button type="button" className="h-10 rounded-full px-4 text-[11px] font-semibold sm:text-xs">
              {t('dashboardPage.timeTracking.actions.adjust')}
            </Button>
          }
        />
      </div>
    </section>
  )
}

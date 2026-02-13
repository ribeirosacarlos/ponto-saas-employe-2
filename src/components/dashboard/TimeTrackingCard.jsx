import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3 } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import { Button } from '../ui/button'
import { AjusteModal } from '../AjusteModal'
import { useClocking } from '../../features/ponto/useClocking'
import { requestAdjustment } from '../../services/modules/employee'
import { useAuthStore } from '../../store/useAuth'
import { useDateTime } from '../../hooks/useDateTime'
import { ViewAllButton } from '../ViewAllButton'

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
  const { t } = useTranslation()
  const { toast } = useToast()
  const { entries, loadingEntries, refreshEntries } = useClocking()
  const { formatDate, formatTime, formatDateForApi } = useDateTime()
  const [sendingAdjustment, setSendingAdjustment] = useState(false)

  const getDateKey = (value) => formatDateForApi(value) || 'invalid'

  const formatClockedTime = (value) => {
    const formatted = formatTime(value, { hour12: false })
    return formatted === '-' ? '--:--' : formatted
  }

  useEffect(() => {
    if (!token) return
    refreshEntries()
  }, [refreshEntries, token])

  const todaysEntries = useMemo(
    () => {
      const todayKey = getDateKey(new Date())
      return entries.filter((entry) => entry.clocked_at && getDateKey(entry.clocked_at) === todayKey)
    },
    [entries],
  )

  const daySummaries = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      if (!entry.clocked_at) return acc
      const key = getDateKey(entry.clocked_at)
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

  const recentDays = useMemo(() => daySummaries.slice(0, 5), [daySummaries])

  const monthlyStats = useMemo(() => {
    const todayKey = getDateKey(new Date())
    const [todayYear, todayMonth] = todayKey.split('-').map((part) => Number(part))
    let totalMinutes = 0
    let workedDays = 0

    daySummaries.forEach((day) => {
      const [year, month] = day.dateKey.split('-').map((part) => Number(part))
      if (year === todayYear && month === todayMonth) {
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
    const label = formatDate(`${dateKey}T00:00:00Z`, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    const timeEntryId =
      form.timeEntryId ||
      form.time_entry_id ||
      form.entry?.id ||
      form.entry?.uuid ||
      entries?.[0]?.id ||
      entries?.[0]?.uuid ||
      null
    if (!timeEntryId) {
      toast({
        title: t('toast.adjustmentError.title'),
        description: t('toast.adjustmentError.description'),
        variant: 'error',
      })
      setSendingAdjustment(false)
      return
    }
    try {
      await requestAdjustment({
        ...form,
        timeEntryId,
      })
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
    <section className="flex flex-col gap-3 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5 sm:gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
              {t('dashboardPage.timeTracking.tag')}
            </p>
            <h2 className="text-sm font-semibold break-words text-balance">
              {t('dashboardPage.timeTracking.title')}
            </h2>
            <p className="mt-1 text-[10px] text-muted-foreground break-words sm:text-[11px]">
              {t('dashboardPage.timeTracking.subtitle', {
                total: monthlyStats.totalHoursLabel,
                extra: monthlyStats.extraHoursLabel,
              })}
            </p>
          </div>
        </div>
        <ViewAllButton label={t('dashboardPage.common.viewAll')} onClick={handleViewFullHistory} />
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 sm:flex-nowrap"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium break-words text-balance">
                  {formatDayLabel(day.dateKey)}
                </span>
                <span className="text-muted-foreground break-words">
                  {t('dashboardPage.timeTracking.interval', {
                    entryLabel: t('dashboardPage.timeTracking.entryLabel'),
                    exitLabel: t('dashboardPage.timeTracking.exitLabel'),
                    start: day.firstIn ? formatClockedTime(day.firstIn) : '--:--',
                    end: day.lastOut ? formatClockedTime(day.lastOut) : '--:--',
                  })}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
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

      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-end">
        <AjusteModal
          entries={entries}
          onSubmit={handleAdjustment}
          isSubmitting={sendingAdjustment}
          trigger={
            <Button
              type="button"
              className="h-10 w-full justify-center rounded-full px-4 text-[11px] font-semibold sm:w-auto sm:text-xs"
            >
              {t('dashboardPage.timeTracking.actions.adjust')}
            </Button>
          }
        />
      </div>
    </section>
  )
}

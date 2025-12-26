import { useMemo } from 'react'
import { CalendarCheck2, CalendarDays, Plane, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { ViewAllButton } from './ViewAllButton'

const statusTone = {
  approved:
    'border border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
  pending:
    'border border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
}

export function TimeOffCard({ summary, onRequest, onViewAll }) {
  const { t } = useTranslation()
  const fallbackSummary = useMemo(
    () => ({
      availableDays: 12,
      nextVacation: t('dashboardPage.timeOff.nextVacationValue'),
      statusKey: 'approved',
      status: t('dashboardPage.timeOff.statusValue.approved'),
      absences: t('dashboardPage.timeOff.absencesValue', { count: 0 }),
    }),
    [t],
  )

  const resolvedSummary = summary || fallbackSummary
  const statusKey = resolvedSummary.statusKey || resolvedSummary.status || 'approved'
  const normalizedStatusKey = typeof statusKey === 'string' ? statusKey.toLowerCase() : 'approved'
  const statusLabel =
    resolvedSummary.status ||
    t(`dashboardPage.timeOff.statusValue.${normalizedStatusKey}`) ||
    resolvedSummary.statusKey
  const statusClass = statusTone[normalizedStatusKey] || statusTone.approved

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
              {t('dashboardPage.timeOff.tag')}
            </p>
            <h2 className="text-sm font-semibold">{t('dashboardPage.timeOff.title')}</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
              {t('dashboardPage.timeOff.subtitle')}
            </p>
          </div>
        </div>
        <ViewAllButton label={t('dashboardPage.common.viewAll')} onClick={() => onViewAll?.()} />
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-[9px] border-border/50 sm:border-[10px]" />
          <div className="absolute inset-0 rotate-[135deg] rounded-full border-[9px] border-primary border-b-transparent border-l-transparent border-r-transparent sm:border-[10px]" />
          <div className="relative flex h-12 w-12 flex-col items-center justify-center rounded-full bg-background text-foreground shadow-sm sm:h-14 sm:w-14">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground sm:text-[10px]">
              {t('dashboardPage.timeOff.gaugeLabel')}
            </span>
            <span className="text-[12px] font-semibold sm:text-sm">{resolvedSummary.availableDays}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.available')}
            </div>
            <span className="text-[12px] font-semibold sm:text-[13px]">
              {resolvedSummary.availableDays} {t('dashboardPage.timeOff.availableSuffix')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <Plane className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.nextVacation')}
            </div>
            <span className="text-[12px] font-semibold sm:text-[13px]">
              {resolvedSummary.nextVacation}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <Timer className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.status')}
            </div>
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold', statusClass)}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground sm:text-[12px]">
            <span>{t('dashboardPage.timeOff.absences')}</span>
            <span className="font-semibold text-foreground">{resolvedSummary.absences}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          className="h-10 w-full rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-[0_18px_40px_-22px_rgba(62,82,152,0.6)] transition hover:-translate-y-0.5 hover:bg-primary/90 sm:h-11 sm:text-xs"
          type="button"
          onClick={() => onRequest?.()}
        >
          {t('dashboardPage.timeOff.request')}
        </button>
      </div>
    </section>
  )
}

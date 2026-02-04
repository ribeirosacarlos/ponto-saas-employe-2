import { AlertTriangle, CalendarCheck2, CalendarDays, Plane, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { ViewAllButton } from './ViewAllButton'

const statusTone = {
  approved:
    'border border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
  pending:
    'border border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
  not_requested:
    'border border-slate-200/80 bg-slate-100/70 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-100',
}

export function TimeOffCard({ summary, onRequest, onViewAll }) {
  const { t } = useTranslation()
  const resolvedSummary = summary || {}
  const statusKey = resolvedSummary.statusKey || resolvedSummary.status || 'not_requested'
  const normalizedStatusKey =
    typeof statusKey === 'string' ? statusKey.toLowerCase() : 'not_requested'
  const hasSummary =
    Boolean(summary) &&
    (summary.availableDays != null ||
      summary.nextVacation ||
      summary.status ||
      summary.statusKey ||
      summary.absences != null)
  const statusDisplayLabel = hasSummary
    ? resolvedSummary.status ||
      t(`dashboardPage.timeOff.statusValue.${normalizedStatusKey}`) ||
      resolvedSummary.statusKey ||
      '--'
    : '--'
  const statusClass =
    hasSummary && statusTone[normalizedStatusKey] ? statusTone[normalizedStatusKey] : 'border border-border bg-muted/60 text-muted-foreground'
  const gaugeAccentClass = hasSummary
    ? 'border-primary border-b-transparent border-l-transparent border-r-transparent'
    : 'border-muted/40 border-b-transparent border-l-transparent border-r-transparent'
  const availableDaysLabel =
    resolvedSummary.availableDays != null ? resolvedSummary.availableDays : '--'
  const nextVacationLabel = resolvedSummary.nextVacation || '--'
  const absencesLabel = resolvedSummary.absences ?? '--'

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
              {t('dashboardPage.timeOff.tag')}
            </p>
            <h2 className="text-sm font-semibold break-words text-balance">
              {t('dashboardPage.timeOff.title')}
            </h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground break-words sm:text-[11px]">
              {t('dashboardPage.timeOff.subtitle')}
            </p>
          </div>
        </div>
        <ViewAllButton label={t('dashboardPage.common.viewAll')} onClick={() => onViewAll?.()} />
      </header>

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-[9px] border-border/50 sm:border-[10px]" />
          <div
            className={`absolute inset-0 rotate-[135deg] rounded-full border-[9px] ${gaugeAccentClass} sm:border-[10px]`}
          />
          <div className="relative flex h-12 w-12 flex-col items-center justify-center rounded-full bg-background text-foreground shadow-sm sm:h-14 sm:w-14">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground sm:text-[10px]">
              {t('dashboardPage.timeOff.gaugeLabel')}
            </span>
            <span className="text-[12px] font-semibold sm:text-sm">{availableDaysLabel}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.available')}
            </div>
            <span className="text-[12px] font-semibold break-words sm:text-[13px] sm:text-right">
              {availableDaysLabel}
              {availableDaysLabel !== '--' ? ` ${t('dashboardPage.timeOff.availableSuffix')}` : ''}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <Plane className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.nextVacation')}
            </div>
            <span className="text-[12px] font-semibold break-words sm:text-[13px] sm:text-right">
              {nextVacationLabel}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <Timer className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.status')}
            </div>
            <span
              className={cn(
                'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold break-words text-center',
                statusClass,
              )}
            >
              {statusDisplayLabel}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
              <AlertTriangle className="h-4 w-4 text-primary" />
              {t('dashboardPage.timeOff.absences')}
            </div>
            <span className="text-[12px] font-semibold break-words sm:text-[13px] sm:text-right">
              {absencesLabel}
            </span>
          </div>
        </div>
      </div>

    </section>
  )
}

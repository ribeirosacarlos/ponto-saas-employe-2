import { CalendarDays, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { ViewAllButton } from './ViewAllButton'

const statusStyles = {
  seen: {
    tone: 'border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-100',
    icon: CheckCircle2,
  },
  pending: {
    tone: 'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-100',
    icon: EyeOff,
  },
}

export function AnnouncementsCard({ announcements, onViewAll }) {
  const { t } = useTranslation()
  const hasAnnouncements = Array.isArray(announcements) && announcements.length > 0

  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5 sm:gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-2xl bg-muted text-muted-foreground text-xs sm:h-8 sm:w-8 sm:text-sm">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
              {t('dashboardPage.announcements.tag')}
            </p>
            <h2 className="text-sm font-semibold break-words text-balance">
              {t('dashboardPage.announcements.title')}
            </h2>
          </div>
        </div>
        <ViewAllButton label={t('dashboardPage.common.viewAll')} onClick={() => onViewAll?.()} />
      </header>

      <div className="space-y-3">
        {hasAnnouncements ? (
          announcements.map((announcement) => {
            const tone = statusStyles[announcement.status] || statusStyles.pending
            const Icon = tone.icon || Eye
            const statusLabel =
              announcement.viewedAt ||
              t(`dashboardPage.announcements.status.${announcement.status}`, {
                defaultValue: t('dashboardPage.announcements.status.pending'),
              })

            return (
              <div
                key={announcement.id || announcement.title}
                className="rounded-2xl border border-border bg-muted/70 px-3 py-3 shadow-inner sm:px-4 sm:py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold break-words">{announcement.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground break-words sm:text-[12px]">
                      {announcement.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground break-words">{announcement.sentAt}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-[0_10px_25px_-18px_rgba(62,82,152,0.45)]',
                      tone.tone,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {statusLabel}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground shadow-inner">
            <p className="break-words">
              {t('dashboardPage.announcements.emptyState', 'No hay comunicados disponibles.')}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

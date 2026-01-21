import { Download, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ViewAllButton } from './ViewAllButton'

const accentTokens = {
  emerald: {
    icon: 'border-emerald-200/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
    pill: 'border-emerald-200/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
    badge:
      'border border-emerald-200/70 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
  },
  indigo: {
    icon: 'border-indigo-200/70 bg-indigo-500/12 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-100',
    pill: 'border-indigo-200/70 bg-indigo-500/12 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-100',
    badge:
      'border border-indigo-200/70 bg-indigo-500/12 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-100',
  },
  amber: {
    icon: 'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
    pill: 'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
    badge:
      'border border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
  },
  slate: {
    icon: 'border-border bg-muted text-foreground',
    pill: 'border-border bg-muted text-foreground',
    badge: 'border border-border bg-muted text-foreground',
  },
}

export function EmployeeDocumentsCard({
  sections,
  onViewAll,
  onAction,
  maxItemsPerSection = 1,
}) {
  const { t } = useTranslation()
  const resolvedSections = sections || []
  const hasVisibleSections = resolvedSections.some((section) => (section.items?.length || 0) > 0)

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
            {t('dashboardPage.documents.tag')}
          </p>
          <h2 className="text-sm font-semibold">{t('dashboardPage.documents.title')}</h2>
          <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
            {t('dashboardPage.documents.subtitle')}
          </p>
        </div>
        <ViewAllButton label={t('dashboardPage.common.viewAll')} onClick={() => onViewAll?.()} />
      </header>

      <div className="grid gap-3 sm:gap-4">
        {hasVisibleSections ? (
          resolvedSections.map((section) => {
            const Icon = section.icon || FileText
            const tone = accentTokens[section.accent] || accentTokens.slate
            const total = section.items?.length || 0
            const displayItems = (section.items || []).slice(0, maxItemsPerSection)

            return (
              <div
                key={section.id || section.title}
                className="rounded-2xl border border-border bg-muted/60 px-3 py-3 shadow-inner sm:px-4 sm:py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone.icon}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className="text-[11px] text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${tone.badge}`}>
                    {t('dashboardPage.documents.total', { count: total })}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {displayItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {item.status ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${tone.pill}`}
                            >
                              {item.status}
                            </span>
                          ) : null}
                          {item.updatedAt ? <span className="truncate">{item.updatedAt}</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAction?.(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/70 px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                      >
                        <Download className="h-4 w-4" />
                        <span>{item.actionLabel || t('dashboardPage.documents.defaultAction')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground shadow-inner">
            <p>{t('dashboardPage.documents.emptyState', 'No hay documentos disponibles.')}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {t('dashboardPage.documents.emptyStateSecondary', 'Aún no se han subido documentos.')}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

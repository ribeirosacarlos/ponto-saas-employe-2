import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

export function ViewAllButton({ label, onClick, icon: Icon = ExternalLink, className }) {
  const { t } = useTranslation()
  const resolvedLabel = label || t('dashboardPage.common.viewAll')

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-[11px] font-semibold text-foreground shadow-[0_12px_28px_-20px_rgba(62,82,152,0.55)] transition hover:-translate-y-0.5 hover:bg-muted/80 sm:text-xs',
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      <span>{resolvedLabel}</span>
    </button>
  )
}

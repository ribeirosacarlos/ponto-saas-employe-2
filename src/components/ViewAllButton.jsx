import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { actionButtonClass } from './ui/form-controls'

export function ViewAllButton({ label, onClick, icon: Icon = ExternalLink, className }) {
  const { t } = useTranslation()
  const resolvedLabel = label || t('dashboardPage.common.viewAll')

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        actionButtonClass,
        'w-full max-w-full text-center sm:w-auto',
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      <span>{resolvedLabel}</span>
    </button>
  )
}

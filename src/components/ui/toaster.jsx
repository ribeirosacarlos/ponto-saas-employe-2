import { cn } from '../../lib/utils'
import { useToast } from './use-toast.jsx'
import { useTranslation } from 'react-i18next'

const variantClasses = {
  default: 'border border-border/70 bg-card/85 text-foreground',
  success:
    'border border-emerald-300/70 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-50',
  error:
    'border border-red-300/70 bg-red-500/12 text-red-800 dark:border-red-400/60 dark:bg-red-500/15 dark:text-red-50',
}

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const { t } = useTranslation()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-2xl px-5 py-4 shadow-[0_24px_70px_-40px_rgba(92,134,255,0.6)] backdrop-blur-md',
            variantClasses[toast.variant] || variantClasses.default,
          )}
        >
          <div className="space-y-1">
            {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
            {toast.description && <p className="text-xs leading-relaxed opacity-90">{toast.description}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            {t('common.actions.close')}
          </button>
        </div>
      ))}
    </div>
  )
}

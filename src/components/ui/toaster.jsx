import { cn } from '../../lib/utils'
import { useToast } from './use-toast.jsx'
import { useTranslation } from 'react-i18next'

const variantStyles = {
  default: {
    card: 'bg-[hsl(var(--card))]/98 border-[hsl(var(--border-strong))]/90 text-[hsl(var(--foreground))]',
    icon: 'bg-[hsl(var(--primary))]/14 text-[hsl(var(--primary))]',
  },
  success: {
    card:
      'bg-[hsl(var(--primary))/0.12] border-[hsl(var(--primary))]/55 text-[hsl(var(--foreground))] shadow-[0_18px_55px_-24px_rgba(72,108,255,0.45)]',
    icon: 'bg-[hsl(var(--primary))]/25 text-[hsl(var(--primary))]',
  },
  error: {
    card:
      'bg-[hsl(var(--destructive))/0.12] border-[hsl(var(--destructive))]/55 text-[hsl(var(--foreground))] shadow-[0_18px_55px_-24px_rgba(208,70,82,0.45)]',
    icon: 'bg-[hsl(var(--destructive))]/22 text-[hsl(var(--destructive))]',
  },
  warning: {
    card:
      'bg-[hsl(var(--ring))/0.12] border-[hsl(var(--ring))]/55 text-[hsl(var(--foreground))] shadow-[0_18px_55px_-24px_rgba(240,180,60,0.35)]',
    icon: 'bg-[hsl(var(--ring))]/22 text-[hsl(var(--ring))]',
  },
}

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const { t } = useTranslation()

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-0 z-50 flex w-full max-w-[calc(100%-1rem)] -translate-x-1/2 justify-center px-3 pt-[env(safe-area-inset-top)] mt-2 md:left-auto md:right-5 md:top-5 md:translate-x-0 md:w-auto md:max-w-sm md:justify-end"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex w-full max-w-xl flex-col gap-3 md:max-w-sm">
        {toasts.map((toast) => {
          const variant = toast.variant || 'default'
          const styles = variantStyles[variant] || variantStyles.default
          const role = variant === 'error' ? 'alert' : 'status'

          return (
            <div
              key={toast.id}
              role={role}
              data-variant={variant}
              data-state={toast.state}
              className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_55px_-28px_rgba(20,32,70,0.45)] backdrop-blur-md transition-all',
                'animate-toast-in',
                toast.state === 'closing' && 'animate-toast-out',
                styles.card,
              )}
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', styles.icon)}>
                {variant === 'success' && (
                  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25A1 1 0 1 1 6.207 9.293L8.5 11.586l6.543-6.543a1 1 0 0 1 1.664.25Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {variant === 'error' && (
                  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {variant === 'warning' && (
                  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l5.517 9.816c.75 1.336-.213 3.008-1.743 3.008H4.483c-1.53 0-2.493-1.672-1.743-3.008l5.517-9.816Zm2.486 10.234a1 1 0 1 0-1.486 1.334 1 1 0 0 0 1.486-1.334ZM9 7a1 1 0 0 1 2 0v3.5a1 1 0 1 1-2 0V7Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {(variant === 'default' || variant === 'info') && (
                  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-12a1 1 0 1 0-2 0 1 1 0 0 0 2 0ZM9 9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-3h1a1 1 0 1 0 0-2H9Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {toast.title && <p className="truncate text-sm font-semibold leading-tight">{toast.title}</p>}
                {toast.description && (
                  <p className="text-xs leading-relaxed text-[hsl(var(--foreground))]/80">{toast.description}</p>
                )}
                {toast.details?.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5 rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/50 px-2.5 py-2">
                    {toast.details.map((d) => (
                      <div key={d.label} className="flex min-w-0 items-baseline gap-1.5">
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--foreground))]/50">
                          {d.label}
                        </span>
                        <code className="min-w-0 truncate text-[10px] text-[hsl(var(--foreground))]/75">
                          {d.value}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label={t('common.actions.close')}
                onClick={() => dismiss(toast.id)}
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--foreground))]/80 transition hover:bg-[hsl(var(--muted))]/80 hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/70 focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {toast.duration ? (
                <span className="absolute inset-x-4 bottom-2 h-0.5 overflow-hidden rounded-full bg-[hsl(var(--border))]/80">
                  <span
                    className="block h-full w-full origin-left bg-[hsl(var(--foreground))]/65 animate-toast-progress"
                    style={{ animationDuration: `${toast.duration}ms` }}
                  />
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

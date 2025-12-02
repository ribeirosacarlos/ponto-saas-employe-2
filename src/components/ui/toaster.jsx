import { cn } from '../../lib/utils'
import { useToast } from './use-toast.jsx'

const variantClasses = {
  default: 'border border-border bg-card text-foreground',
  success: 'border border-green-500/70 bg-green-500/10 text-green-100',
  error: 'border border-red-500/70 bg-red-500/10 text-red-100',
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg backdrop-blur-md',
            variantClasses[toast.variant] || variantClasses.default,
          )}
        >
          <div className="space-y-1">
            {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
            {toast.description && (
              <p className="text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            Fechar
          </button>
        </div>
      ))}
    </div>
  )
}

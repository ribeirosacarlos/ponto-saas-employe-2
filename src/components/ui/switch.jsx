import { cn } from '../../lib/utils'

export function Switch({ checked = false, onCheckedChange = () => {}, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border border-border/70 bg-muted transition-colors',
        checked ? 'bg-primary/80 border-primary/70' : 'bg-muted',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  )
}

import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function PontoButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'default',
  ...props
}) {
  return (
    <Button
      variant={variant === 'outline' ? 'outline' : 'default'}
      size="lg"
      onClick={onClick}
      {...props}
      className={cn(
        'w-full justify-start gap-3 rounded-xl text-left shadow-md transition hover:-translate-y-0.5',
        variant === 'outline' && 'border-borderStrong bg-background/70',
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {Icon && <Icon className="h-5 w-5" />}
      </span>
      <span className="flex flex-col items-start">
        <span className="text-base font-semibold">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </Button>
  )
}

import { cn } from '../../lib/utils'

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('text-sm font-semibold leading-none text-foreground/80', className)}
      {...props}
    />
  )
}

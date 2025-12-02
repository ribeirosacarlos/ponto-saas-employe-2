import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})

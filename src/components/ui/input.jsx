import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-xl border border-border/80 bg-white/80 px-4 py-2 text-sm text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/70 backdrop-blur-md',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})

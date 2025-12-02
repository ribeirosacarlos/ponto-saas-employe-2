import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-card/80 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.45)] backdrop-blur',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('p-5 pb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-2', className)} {...props} />
}

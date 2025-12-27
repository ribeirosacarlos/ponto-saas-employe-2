import { cn } from '../../lib/utils'

export function PageContainer({ className, children, ...props }) {
  return (
    <div
      className={cn('w-full mx-auto px-3 sm:px-4 lg:px-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}

import { cn } from '../../lib/utils'

export function PageContainer({ className, children, ...props }) {
  return (
    <div
      className={cn('w-full mx-auto px-4 sm:px-6 lg:max-w-[1280px] lg:px-8', className)}
      {...props}
    >
      {children}
    </div>
  )
}

import { cn } from '../../lib/utils'

export function PageContainer({ className, children, ...props }) {
  return (
    <div
      className={cn(
        `
        w-full mx-auto
        px-4 sm:px-6 lg:px-8
        lg:max-w-[1280px]
        pt-4 pb-10
        sm:pt-6
        `,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}


import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:shadow-lg hover:brightness-110',
        outline:
          'border border-borderStrong bg-background/50 text-foreground hover:bg-accent hover:text-foreground',
        ghost: 'text-foreground hover:bg-accent',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:shadow hover:-translate-y-0.5',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-red-600',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }

import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[2px] active:translate-y-[0.5px] disabled:opacity-60 disabled:cursor-not-allowed ring-offset-background shadow-[0_1px_0_rgba(255,255,255,0.35)] dark:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75 text-primary-foreground shadow-[0_18px_50px_-25px_rgba(62,82,152,0.9)] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-28px_rgba(62,82,152,0.95)]',
        outline:
          'border border-borderStrong/70 bg-card/70 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-ring hover:bg-background/90',
        ghost: 'text-foreground hover:bg-accent hover:text-foreground',
        secondary:
          'border border-border/70 bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:border-ring',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-8 px-2.5',
        lg: 'h-8 px-3',
        icon: 'h-8 w-8',
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

import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { formControlClass } from './form-controls'

export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(formControlClass, className)} {...props} />
})

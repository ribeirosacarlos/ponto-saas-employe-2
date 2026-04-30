import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { formControlClass } from './form-controls'

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(formControlClass, className)}
      ref={ref}
      {...props}
    />
  )
})

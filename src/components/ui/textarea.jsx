import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { textareaControlClass } from './form-controls'

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn('min-h-[120px]', textareaControlClass, className)}
      ref={ref}
      {...props}
    />
  )
})

import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-8 px-3 text-sm rounded-md border-[1px] outline-none',
          'bg-transparent text-foreground placeholder:text-muted-foreground/60',
          error
            ? 'border-destructive focus:ring-1 focus:ring-destructive'
            : 'border-border focus:ring-1 focus:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

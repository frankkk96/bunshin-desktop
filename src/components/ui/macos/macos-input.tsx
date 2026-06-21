import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface MacOSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const MacOSInput = forwardRef<HTMLInputElement, MacOSInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-2.5 py-1.5 text-xs rounded-md border-[1px] outline-none',
          'bg-muted text-foreground placeholder:text-muted-foreground',
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

MacOSInput.displayName = 'MacOSInput'

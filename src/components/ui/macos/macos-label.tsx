import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface MacOSLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const MacOSLabel = forwardRef<HTMLLabelElement, MacOSLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'flex items-center gap-2 text-sm leading-none font-medium select-none',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)

MacOSLabel.displayName = 'MacOSLabel'

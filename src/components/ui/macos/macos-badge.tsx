import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface MacOSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export const MacOSBadge = forwardRef<HTMLSpanElement, MacOSBadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      destructive: 'border-transparent bg-destructive text-white',
      outline: 'text-foreground border-border',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium',
          'w-fit whitespace-nowrap shrink-0 overflow-hidden',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

MacOSBadge.displayName = 'MacOSBadge'

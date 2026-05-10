import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface MacOSSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export const MacOSSeparator = forwardRef<HTMLDivElement, MacOSSeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className,
        )}
        {...props}
      />
    )
  },
)

MacOSSeparator.displayName = 'MacOSSeparator'

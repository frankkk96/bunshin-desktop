import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/ui/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        destructive: 'bg-destructive/10 text-destructive border-destructive/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export const MacOSAlert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))

MacOSAlert.displayName = 'MacOSAlert'

export const MacOSAlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))

MacOSAlertDescription.displayName = 'MacOSAlertDescription'

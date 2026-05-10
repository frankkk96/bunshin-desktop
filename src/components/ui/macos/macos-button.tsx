import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface MacOSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'icon'
  size?: 'sm' | 'md' | 'lg'
}

export const MacOSButton = forwardRef<HTMLButtonElement, MacOSButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'bg-transparent border border-border hover:bg-background',
      ghost: 'bg-transparent hover:bg-background',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      icon: 'bg-transparent hover:bg-accent active:bg-accent',
    }

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-5 text-base',
    }

    const iconSizeStyles = {
      sm: 'h-7 w-7',
      md: 'h-8 w-8',
      lg: 'h-9 w-9',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          variant === 'icon' ? iconSizeStyles[size] : sizeStyles[size],
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  },
)

MacOSButton.displayName = 'MacOSButton'

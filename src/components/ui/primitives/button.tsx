import { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'icon'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'bg-transparent border border-border hover:bg-accent',
      ghost: 'bg-transparent hover:bg-accent',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      icon: 'bg-transparent hover:bg-accent active:bg-accent',
    }

    const sizeStyles = {
      // Standard control height is 32px (h-8) to match inputs/selects.
      sm: 'h-7 px-2.5 text-xs',
      md: 'h-8 px-3.5 text-sm',
      lg: 'h-9 px-4 text-sm',
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

Button.displayName = 'Button'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/ui/utils'

type IconButtonProps = {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'className' | 'onClick'>

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      className,
      style,
      onClick,
      disabled = false,
      type,
      ...rest
    },
    ref,
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled}
        style={{
          backgroundColor: 'transparent',
          ...style,
        }}
        className={cn(
          'p-1.5 rounded-md border-none flex items-center justify-center cursor-pointer transition-transform duration-150 ease-out hover:scale-110 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:bg-transparent',
          className,
        )}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'

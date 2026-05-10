import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/ui/utils'

interface MacOSSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  maxWidth?: string
  height?: string
  placement?: 'center' | 'top-left' | 'top-right'
}

export function MacOSSheet({
  isOpen,
  onClose,
  children,
  className,
  maxWidth = '500px',
  height = '500px',
  placement = 'center',
}: MacOSSheetProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const getContainerClasses = () => {
    if (placement === 'top-left') return 'fixed inset-0 z-50 flex items-start justify-start'
    if (placement === 'top-right') return 'fixed inset-0 z-50 flex items-start justify-end'
    return 'fixed inset-0 z-50 flex items-center justify-center'
  }

  const getSheetClasses = () => {
    const baseClasses = 'relative rounded-xl border border-border/30 flex flex-col overflow-hidden bg-popover'
    if (placement === 'top-left') return `${baseClasses} mt-12 ml-16`
    if (placement === 'top-right') return `${baseClasses} mt-12 mr-16`
    return baseClasses
  }

  const getWidth = () => {
    if (placement === 'top-left' || placement === 'top-right') return maxWidth
    return '90%'
  }

  return createPortal(
    <div className={getContainerClasses()} onClick={onClose}>
      {/* Sheet Container */}
      <div
        className={cn(getSheetClasses(), className)}
        style={{
          width: getWidth(),
          maxWidth,
          height,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface MacOSSheetHeaderProps {
  children: React.ReactNode
  className?: string
  compact?: boolean
}

export function MacOSSheetHeader({ children, className, compact = false }: MacOSSheetHeaderProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 border-b border-border/30',
        compact ? 'px-4 pt-4 pb-3' : 'px-6 pt-5 pb-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface MacOSSheetTitleProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MacOSSheetTitle({ children, className, size = 'md' }: MacOSSheetTitleProps) {
  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
  }

  return <h2 className={cn(sizeClasses[size], 'text-foreground', className)}>{children}</h2>
}

interface MacOSSheetDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function MacOSSheetDescription({ children, className }: MacOSSheetDescriptionProps) {
  return <p className={cn('text-xs text-muted-foreground mt-1', className)}>{children}</p>
}

interface MacOSSheetContentProps {
  children: React.ReactNode
  className?: string
}

export function MacOSSheetContent({ children, className }: MacOSSheetContentProps) {
  return <div className={cn('flex-1 overflow-auto bg-popover', className)}>{children}</div>
}

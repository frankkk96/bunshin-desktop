import { cn } from '@/lib/ui/utils'
import { ReactNode } from 'react'

interface SettingRowProps {
  icon?: ReactNode
  title: string
  description?: string | ReactNode
  children: ReactNode
  onClick?: () => void
  className?: string
  /** 显示在 description 右边的操作按钮 */
  action?: ReactNode
}

export function SettingRow({
  icon,
  title,
  description,
  children,
  onClick,
  className,
  action,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between min-h-11 py-1.5 px-4 rounded-md',
        onClick && 'cursor-pointer hover:bg-accent',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground/70 flex items-center justify-center w-4 h-4">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-normal text-sm text-foreground">{title}</div>
          {description && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground/80">{description}</span>
              {action}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

import { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/ui/utils'

interface SettingModalProps {
  /** 显示的文本 */
  label: string
  /** 左侧图标 */
  icon?: ReactNode
  /** 点击回调 */
  onClick: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 警告提示文本 */
  warning?: string
  className?: string
}

/**
 * 设置项 Modal 触发器
 * 类似 SettingSelect 的样式，但点击后打开 Modal 而不是下拉选择
 */
export function SettingModal({
  label,
  icon,
  onClick,
  disabled = false,
  warning,
  className,
}: SettingModalProps) {
  return (
    <div
      className={cn(
        'relative flex items-center text-sm py-1 px-2 rounded-md h-8',
        'bg-transparent hover:bg-accent cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className,
      )}
      onClick={disabled ? undefined : onClick}
    >
      {icon && <div className="mr-2 flex items-center">{icon}</div>}
      <div className="flex-1 pr-2 truncate">
        <span>{label}</span>
        {warning && (
          <span className="ml-2 text-xs text-destructive">({warning})</span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  )
}

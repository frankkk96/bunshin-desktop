import { ReactNode } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/ui/utils'

interface Option {
  value: string
  label: string
  icon?: ReactNode // Provider icon as React component
  indicator?: ReactNode // 额外的状态指示器，显示在选中项旁边
}

interface SettingSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Option[]
  className?: string
  disabled?: boolean
}

export function SettingSelect({
  value,
  onValueChange,
  options,
  className = '',
  disabled = false,
}: SettingSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value)

  // 确保 value 在 options 中存在，否则使用空字符串作为占位
  const effectiveValue = selectedOption ? value : ''

  // 构建选项列表，如果当前值不在选项中，添加一个占位选项
  const effectiveOptions = selectedOption
    ? options
    : [{ value: '', label: 'Select...' }, ...options]

  return (
    <div
      className={cn(
        'relative flex items-center text-sm py-1 px-2 rounded-md h-8',
        'bg-transparent hover:bg-accent',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className,
      )}
    >
      {/* 左侧图标 */}
      {selectedOption?.icon && (
        <div className="mr-2 pointer-events-none flex items-center">{selectedOption.icon}</div>
      )}

      {/* select元素覆盖整个区域 */}
      <select
        value={effectiveValue}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      >
        {effectiveOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 显示选中的文本 */}
      <span className="flex-1 pr-2 truncate">{selectedOption?.label || 'Select...'}</span>

      {/* 右侧指示器和箭头 */}
      <div className="flex items-center gap-2 pointer-events-none flex-shrink-0">
        {selectedOption?.indicator}
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}

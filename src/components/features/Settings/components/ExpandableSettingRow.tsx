import { ReactNode, useState } from 'react'

interface ExpandableSettingRowProps {
  icon?: ReactNode
  title: string
  description?: string | ReactNode
  children: ReactNode
  expandedContent?: ReactNode
  className?: string
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  previewValue?: string
  placeholder?: string
}

export function ExpandableSettingRow({
  icon,
  title,
  description,
  children,
  expandedContent,
  className = '',
  isExpanded: controlledExpanded,
  onExpandedChange,
  previewValue,
  placeholder = 'Click to edit...',
}: ExpandableSettingRowProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleToggle = () => {
    const newExpanded = !isExpanded
    if (onExpandedChange) {
      onExpandedChange(newExpanded)
    } else {
      setInternalExpanded(newExpanded)
    }
  }

  const displayText = previewValue || placeholder
  const truncatedText = displayText.length > 50 ? displayText.slice(0, 50) + '...' : displayText

  return (
    <div className={className}>
      {/* 原始的SettingRow布局 - 只有右侧可点击 */}
      <div className="flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground/70 flex items-center justify-center w-4 h-4">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-normal text-sm text-foreground leading-none">{title}</div>
            {description && (
              <div className="mt-1 text-xs text-muted-foreground/80 mt-0.5 leading-tight">
                {typeof description === 'string' ? description : description}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-3 flex items-center gap-2 h-6">
          {/* 预览文本 - 显示在右侧 */}
          {previewValue !== undefined && (
            <div className="text-xs text-muted-foreground/60 leading-tight truncate max-w-[200px]">
              {previewValue ? truncatedText : placeholder}
            </div>
          )}
          {/* Clickable trigger area */}
          <div
            onClick={handleToggle}
            className="bg-transparent hover:bg-accent rounded-md cursor-pointer"
          >
            {children}
          </div>
        </div>
      </div>

      {/* 展开的内容区域 - 覆盖整个宽度 */}
      {isExpanded && expandedContent && (
        <div className="mt-2 p-4 bg-muted/20 rounded-md">{expandedContent}</div>
      )}
    </div>
  )
}

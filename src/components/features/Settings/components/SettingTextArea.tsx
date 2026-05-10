import { useState } from 'react'
import { cn } from '@/lib/ui/utils'
import { Check, X, ChevronRight, ChevronDown } from 'lucide-react'
import { MacOSTextarea } from '@/components/ui'

interface SettingTextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onExpandedChange?: (expanded: boolean) => void
  isExpanded?: boolean
}

export function SettingTextArea({
  value,
  onChange,
  placeholder = 'Click to edit...',
  onExpandedChange,
  isExpanded: controlledExpanded,
}: SettingTextAreaProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleConfirm = () => {
    onChange(editValue)
    const newExpanded = false
    if (onExpandedChange) {
      onExpandedChange(newExpanded)
    } else {
      setInternalExpanded(newExpanded)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    const newExpanded = false
    if (onExpandedChange) {
      onExpandedChange(newExpanded)
    } else {
      setInternalExpanded(newExpanded)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleConfirm()
    }
  }

  // 触发按钮组件 - 只显示箭头图标
  const TriggerButton = isExpanded ? (
    <ChevronDown className="w-4 h-4 text-muted-foreground" />
  ) : (
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  )

  // 展开内容组件
  const ExpandedContent = isExpanded ? (
    <div className="space-y-3">
      <MacOSTextarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('w-full min-h-[120px] p-3 text-sm', 'bg-background rounded-md', 'resize-y')}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCancel}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs',
            'bg-background border border-border rounded-md',
            'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:cursor-pointer',
          )}
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs',
            'bg-primary text-primary-foreground rounded-md',
            'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:cursor-pointer',
          )}
        >
          <Check className="w-3 h-3" />
          Save
        </button>
      </div>
    </div>
  ) : null

  return {
    trigger: TriggerButton,
    expandedContent: ExpandedContent,
    isExpanded,
  }
}

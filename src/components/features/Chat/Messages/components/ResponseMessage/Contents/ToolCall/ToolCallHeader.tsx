import { Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { ToolCallItem } from '@/lib/core/messages/types'
import { ToolCallStatus } from './ToolCallStatus'
import { ApprovalButtons, RetryButton } from './ToolCallActions'
import { formatTime } from './utils'
import { ToolCallAction } from '@/lib/core/extensions/types'

interface ToolCallHeaderProps {
  toolCall: ToolCallItem
  isExpanded: boolean
  isExecuting: boolean
  executionTime: number
  argsPreview: string
  isProcessing: boolean
  onToggleExpand: () => void
  onApproval: (action: ToolCallAction) => void
  onRetry: () => void
}

export function ToolCallHeader({
  toolCall,
  isExpanded,
  isExecuting,
  executionTime,
  argsPreview,
  isProcessing,
  onToggleExpand,
  onApproval,
  onRetry,
}: ToolCallHeaderProps) {
  const isPendingApproval = toolCall.status === 'pending_approval'
  const isFailed = toolCall.status === 'failed'

  return (
    <div className="px-3 py-2 flex items-center gap-2">
      {/* Left: Status + Function + Args Preview */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ToolCallStatus toolCall={toolCall} />

        {toolCall.tc.function.name && (
          <span className="text-sm font-mono font-medium flex-shrink-0">
            {toolCall.tc.function.name}
          </span>
        )}

        {!isExpanded && argsPreview && (
          <span className="text-xs font-mono opacity-60 truncate">{argsPreview}</span>
        )}

        {isExecuting && (
          <div className="flex items-center gap-1 text-[10px] font-mono opacity-60 flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{formatTime(executionTime)}</span>
          </div>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Approval Buttons (Pending state) */}
        {isPendingApproval && (
          <ApprovalButtons isProcessing={isProcessing} onApproval={onApproval} />
        )}

        {/* Retry Button (Failed state) */}
        {isFailed && toolCall.tc.function.name && toolCall.tc.function.arguments && (
          <RetryButton isProcessing={isProcessing} onRetry={onRetry} />
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpand}
          className="p-1 hover:bg-background/60 rounded transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

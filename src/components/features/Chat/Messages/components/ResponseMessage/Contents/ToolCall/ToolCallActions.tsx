import { PlayCircle, Infinity, CircleX, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/ui/utils'
import { ToolCallAction } from '@/lib/core/extensions/types'

interface ApprovalButtonsProps {
  isProcessing: boolean
  onApproval: (action: ToolCallAction) => void
}

export function ApprovalButtons({ isProcessing, onApproval }: ApprovalButtonsProps) {
  return (
    <>
      <button
        onClick={() => onApproval('allow')}
        disabled={isProcessing}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium',
          'bg-background hover:bg-muted border border-border',
          'transition-colors cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <PlayCircle className="w-3 h-3" />
        )}
        <span>Allow</span>
      </button>

      <button
        onClick={() => onApproval('allow_always')}
        disabled={isProcessing}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium',
          'bg-background hover:bg-muted border border-border',
          'transition-colors cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Infinity className="w-3 h-3" />
        )}
        <span>Always</span>
      </button>

      <button
        onClick={() => onApproval('reject')}
        disabled={isProcessing}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium',
          'bg-background hover:bg-muted border border-border',
          'transition-colors cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <CircleX className="w-3 h-3" />
        )}
        <span>Deny</span>
      </button>
    </>
  )
}

interface RetryButtonProps {
  isProcessing: boolean
  onRetry: () => void
}

export function RetryButton({ isProcessing, onRetry }: RetryButtonProps) {
  return (
    <button
      onClick={onRetry}
      disabled={isProcessing}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium',
        'bg-background hover:bg-muted border border-border',
        'transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <RotateCcw className="w-3 h-3" />
      )}
      <span>Retry</span>
    </button>
  )
}

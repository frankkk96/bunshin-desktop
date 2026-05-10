import {
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/ui/utils'
import { ToolCallItem } from '@/lib/core/messages/types'

interface StatusConfig {
  label: string
  icon: LucideIcon
  iconColor: string
  animate?: boolean
}

export function getStatusConfig(toolCall: ToolCallItem): StatusConfig {
  const isPendingApproval = toolCall.status === 'pending_approval'
  const isRejected = toolCall.status === 'rejected'
  const isFailed = toolCall.status === 'failed'
  const isCompleted = toolCall.status === 'completed'
  const isExecuting = toolCall.status === 'executing'

  if (isPendingApproval) {
    return {
      label: 'Pending',
      icon: AlertCircle,
      iconColor: 'text-orange-600/70 dark:text-orange-400/60',
    }
  }
  if (isRejected) {
    return {
      label: 'Rejected',
      icon: XCircle,
      iconColor: 'text-red-600/60 dark:text-red-400/50',
    }
  }
  if (isFailed) {
    return {
      label: 'Failed',
      icon: XCircle,
      iconColor: 'text-red-600/60 dark:text-red-400/50',
    }
  }
  if (isCompleted) {
    return {
      label: 'Completed',
      icon: CheckCircle2,
      iconColor: 'text-green-600/60 dark:text-green-400/50',
    }
  }
  if (isExecuting) {
    return {
      label: 'Executing',
      icon: Loader2,
      iconColor: 'text-blue-600/70 dark:text-blue-400/60',
      animate: true,
    }
  }
  return {
    label: 'Tool Call',
    icon: PlayCircle,
    iconColor: 'text-foreground/50',
  }
}

interface ToolCallStatusProps {
  toolCall: ToolCallItem
  className?: string
}

export function ToolCallStatus({ toolCall, className }: ToolCallStatusProps) {
  const statusConfig = getStatusConfig(toolCall)
  const StatusIcon = statusConfig.icon

  return (
    <StatusIcon
      className={cn(
        'w-4 h-4 flex-shrink-0',
        statusConfig.iconColor,
        statusConfig.animate && 'animate-spin',
        className,
      )}
    />
  )
}

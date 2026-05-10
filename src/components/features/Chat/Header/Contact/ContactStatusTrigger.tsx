import { useMemo, forwardRef } from 'react'
import { CheckCircle2, AlertTriangle, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/ui/utils'
import { AgentStatusData, GroupStatusData } from '@/hooks/status/types'

interface BaseStatusTriggerProps {
  status: AgentStatusData | GroupStatusData | null
  isLoading?: boolean
}

// Helper to check if it's a GroupStatusData
function isGroupStatus(status: any): status is GroupStatusData {
  return status && 'agents' in status && Array.isArray(status.agents)
}

// Helper to check if it's an AgentStatusData
function isAgentStatus(status: any): status is AgentStatusData {
  return status && 'issues' in status && Array.isArray(status.issues)
}

// Calculate total issues from group status
function getGroupTotalIssues(status: GroupStatusData): number {
  return status.agents.reduce((total, agent) => total + agent.issues.length, 0)
}

export const GroupStatusTrigger = forwardRef<HTMLDivElement, BaseStatusTriggerProps>(
  ({ status, isLoading, ...props }, ref) => {
    const { Icon, color, isAnimated } = useMemo(() => {
      if (!status || isLoading) {
        return {
          Icon: LoaderCircle,
          color: 'text-blue-500',
          isAnimated: true,
        }
      }

      if (status.isReady) {
        return {
          Icon: CheckCircle2,
          color: 'text-green-500',
          isAnimated: false,
        }
      }

      if (isGroupStatus(status) && getGroupTotalIssues(status) > 0) {
        return {
          Icon: AlertTriangle,
          color: 'text-amber-500',
          isAnimated: false,
        }
      }

      return {
        Icon: LoaderCircle,
        color: 'text-blue-500',
        isAnimated: true,
      }
    }, [status, isLoading])

    return (
      <div ref={ref} className="cursor-help" {...props}>
        <Icon className={cn('w-3.5 h-3.5', color, isAnimated && 'animate-spin')} />
      </div>
    )
  },
)

GroupStatusTrigger.displayName = 'GroupStatusTrigger'

export const CustomAgentStatusTrigger = forwardRef<HTMLDivElement, BaseStatusTriggerProps>(
  ({ status, isLoading, ...props }, ref) => {
    const { Icon, color, isAnimated } = useMemo(() => {
      if (!status || isLoading) {
        return {
          Icon: LoaderCircle,
          color: 'text-blue-500',
          isAnimated: true,
        }
      }

      if (status.isReady) {
        return {
          Icon: CheckCircle2,
          color: 'text-green-500',
          isAnimated: false,
        }
      }

      if (isAgentStatus(status) && status.issues.length > 0) {
        return {
          Icon: AlertTriangle,
          color: 'text-amber-500',
          isAnimated: false,
        }
      }

      return {
        Icon: LoaderCircle,
        color: 'text-blue-500',
        isAnimated: true,
      }
    }, [status, isLoading])

    return (
      <div ref={ref} className="cursor-help" {...props}>
        <Icon className={cn('w-3.5 h-3.5', color, isAnimated && 'animate-spin')} />
      </div>
    )
  },
)

CustomAgentStatusTrigger.displayName = 'CustomAgentStatusTrigger'

import { useCallback, useMemo } from 'react'
import type { QueryMessage } from '@/lib/core/messages/types'
import { useAgentsByIds } from '@/hooks/contacts/agents/query'
import { useProviders } from '@/hooks/models/useModels'
import { ProviderIcon } from '@/components/common'
import {
  MacOSTooltip,
  MacOSTooltipContent,
  MacOSTooltipProvider,
  MacOSTooltipTrigger,
} from '@/components/ui/macos/macos-tooltip'
import { toast } from '@/lib/core/utils/toast'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'

interface QueryMessageActionsProps {
  message: QueryMessage
  onEdit?: (message: QueryMessage) => void
}

const MAX_VISIBLE_AGENTS = 3

export function QueryMessageActions({ message, onEdit }: QueryMessageActionsProps) {
  const { session } = useSession()
  const { retryQuery } = useSessionActions(session?.id)
  const agents = useAgentsByIds(message.agents)
  const { data: providers = [] } = useProviders()

  // 创建 providerId -> avatar 的映射
  const providerAvatarMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const provider of providers) {
      map.set(provider.id, provider.avatar)
    }
    return map
  }, [providers])

  const getProviderAvatar = (providerId: string): string => {
    return providerAvatarMap.get(providerId) ?? providerId
  }

  const visibleAgents = agents.slice(0, MAX_VISIBLE_AGENTS)
  const hiddenCount = agents.length - MAX_VISIBLE_AGENTS

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(message)
    }
  }, [onEdit, message])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast.success('Message copied to clipboard')
    })
  }, [message.text])

  const handleRetry = useCallback(() => {
    if (!session?.id) return
    retryQuery(message.queryId)
  }, [retryQuery, message.queryId])

  return (
    <div className="flex items-center gap-2 mt-1 opacity-0 group-hover/message:opacity-100">
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Copy"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button
        onClick={handleEdit}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Edit"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button
        onClick={handleRetry}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Retry"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 4v6h6"></path>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>

      {agents.length > 0 && (
        <MacOSTooltipProvider delayDuration={200}>
          <MacOSTooltip>
            <MacOSTooltipTrigger asChild>
              <div className="flex items-center -space-x-1.5 ml-2 cursor-default">
                {visibleAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-background"
                  >
                    <ProviderIcon provider={getProviderAvatar(agent.llm.providerId)} size={14} />
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-background">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      +{hiddenCount}
                    </span>
                  </div>
                )}
              </div>
            </MacOSTooltipTrigger>
            <MacOSTooltipContent side="bottom" className="text-xs">
              {agents.map((a) => `@${a.alias}`).join(', ')}
            </MacOSTooltipContent>
          </MacOSTooltip>
        </MacOSTooltipProvider>
      )}
    </div>
  )
}

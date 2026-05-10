import { useState, useCallback } from 'react'
import { IoChatbubbleOutline } from 'react-icons/io5'
import { Loader2 } from 'lucide-react'
import { MacOSButton } from '@/components/ui'
import { EditableName } from '../../../common/Layout/EditableName'
import { toast } from '@/lib/core/utils/toast'
import { validateAgentName } from '@/lib/ui/validation/forms'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { useAgentById, useAllAgents } from '@/hooks/contacts/agents/query'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import type { Agent } from '@/lib/core/agent/types'

export function AgentInfoSection({ agent }: { agent: Agent }) {
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Agent data and mutations
  const { data: currentAgent } = useAgentById(agent.id)
  const { data: allAgents = [] } = useAllAgents()
  const { updateAgent } = useAgentMutations()
  const { navigateToContactChat } = useAppNavigation()

  // Chat 点击处理
  const handleChatClick = useCallback(async () => {
    setIsChatLoading(true)
    try {
      await navigateToContactChat(agent.id)
    } finally {
      setIsChatLoading(false)
    }
  }, [agent.id, navigateToContactChat])

  // 检查重复名称
  const checkDuplicateName = useCallback(
    async (name: string): Promise<boolean> => {
      return allAgents.some((a) => a.id !== agent.id && a.alias === name)
    },
    [allAgents, agent.id],
  )

  const handleNameSave = (newName: string) => {
    if (currentAgent) {
      updateAgent.mutate(
        { ...currentAgent, alias: newName },
        {
          onSuccess: () => toast.success('Name updated successfully'),
          onError: () => toast.error('Failed to update name'),
        },
      )
    }
  }

  return (
    <>
      <div className="w-full">
        <EditableName
          name={agent.alias}
          onSave={handleNameSave}
          validateName={validateAgentName}
          checkDuplicate={checkDuplicateName}
        />
      </div>

      <div className="text-sm leading-relaxed opacity-70 text-muted-foreground">
        {agent.description}
      </div>
      <div className="mt-4">
        <MacOSButton
          onClick={handleChatClick}
          disabled={isChatLoading}
          className="flex items-center gap-2 px-6 py-2 w-full max-w-xs"
          title="Start a chat with this agent"
        >
          {isChatLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <IoChatbubbleOutline size={16} />
          )}
          {isChatLoading ? 'Starting chat...' : 'Start Chat'}
        </MacOSButton>
      </div>
    </>
  )
}

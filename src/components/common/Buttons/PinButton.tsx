import { IoStar, IoStarOutline } from 'react-icons/io5'
import { MacOSTooltip, MacOSTooltipContent, MacOSTooltipTrigger } from '@/components/ui'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useGroupMutations } from '@/hooks/contacts/groups/mutations'
import { useAllGroups } from '@/hooks/contacts/groups/query'

interface PinButtonProps {
  agentId?: string
  groupId?: string
}

export function PinButton({ agentId, groupId }: PinButtonProps) {
  // Agent data and mutations
  const { data: agent } = useAgentById(agentId || '')
  const { updateAgent } = useAgentMutations()

  // Group data and mutations
  const { data: groups = [] } = useAllGroups()
  const groupMutations = useGroupMutations()
  const group = groups.find((g) => g.id === groupId)

  const isPinned = agent?.pinned || group?.pinned

  const handleToggle = () => {
    // 如果有 groupId，使用 group 更新逻辑
    if (groupId && group) {
      groupMutations.updateGroup.mutate({ ...group, pinned: !isPinned })
      return
    }

    // 如果有 agentId，使用内部的 agent 更新逻辑
    if (agentId && agent) {
      updateAgent.mutate({ ...agent, pinned: !isPinned })
    }
  }

  return (
    <MacOSTooltip>
      <MacOSTooltipTrigger asChild>
        <button
          onClick={handleToggle}
          className={`p-2 rounded-full hover:cursor-pointer ${
            isPinned ? 'text-warning' : 'text-muted-foreground'
          }`}
          title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
        >
          {isPinned ? (
            <IoStar size={24} className="drop-shadow-lg" />
          ) : (
            <IoStarOutline size={24} className="hover:scale-110" />
          )}
        </button>
      </MacOSTooltipTrigger>
      <MacOSTooltipContent side="top" sideOffset={5}>
        {isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
      </MacOSTooltipContent>
    </MacOSTooltip>
  )
}

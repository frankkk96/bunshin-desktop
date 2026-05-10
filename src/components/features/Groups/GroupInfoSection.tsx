import { useState, useCallback } from 'react'
import type { Group } from '@/lib/core/group/types'
import { IoChatbubbleOutline } from 'react-icons/io5'
import { Loader2 } from 'lucide-react'
import { MacOSButton } from '@/components/ui'
import { toast } from '@/lib/core/utils/toast'
import { validateAgentName } from '@/lib/ui/validation/forms'
import { useGroupMutations } from '@/hooks/contacts/groups/mutations'
import { useAllGroups } from '@/hooks/contacts/groups/query'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { EditableName } from '@/components/common/Layout/EditableName'

export function GroupInfoSection({ group }: { group: Group }) {
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Group data and mutations
  const { data: groups = [] } = useAllGroups()
  const groupMutations = useGroupMutations()
  const { navigateToContactChat } = useAppNavigation()

  // group.agents 现在直接是 Agent[] 实体数组
  const groupAgents = group.agents

  const description = `${groupAgents.length} member${groupAgents.length !== 1 ? 's' : ''}`

  // Chat 点击处理
  const handleChatClick = useCallback(async () => {
    setIsChatLoading(true)
    try {
      await navigateToContactChat(group.id)
    } finally {
      setIsChatLoading(false)
    }
  }, [group.id, navigateToContactChat])

  // 检查重复名称
  const checkDuplicateName = useCallback(
    async (name: string): Promise<boolean> => {
      return groups.some((g) => g.id !== group.id && g.alias === name)
    },
    [groups, group.id],
  )

  const handleNameSave = (newName: string) => {
    groupMutations.updateGroup.mutate(
      { ...group, alias: newName },
      {
        onSuccess: () => toast.success('Name updated successfully'),
        onError: () => toast.error('Failed to update name'),
      },
    )
  }

  return (
    <>
      <div className="w-full">
        <EditableName
          name={group.alias}
          onSave={handleNameSave}
          validateName={validateAgentName}
          checkDuplicate={checkDuplicateName}
        />
      </div>

      <div className="text-sm leading-relaxed opacity-70 text-muted-foreground">{description}</div>

      <div className="mt-4">
        <MacOSButton
          onClick={handleChatClick}
          disabled={isChatLoading}
          className="flex items-center gap-2 px-6 py-2 w-full max-w-xs"
          title="Start a chat with this group"
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

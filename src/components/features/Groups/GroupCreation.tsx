import { useState } from 'react'
import {
  MacOSButton,
  MacOSLabel,
  MacOSCheckbox,
  MacOSScrollArea,
  MacOSInput,
} from '@/components/ui'
import { useAllAgents } from '@/hooks/contacts/agents/query'
import { useGroupMutations } from '@/hooks/contacts/groups/mutations'
import { Avatar } from '@/components/common'
import { Users, Plus } from 'lucide-react'
import { handleDatabaseError } from '@/lib/core/utils/error'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { generateUniqueAgentName, validateAgentName } from '@/lib/ui/validation/forms'
import { toast } from '@/lib/core/utils/toast'
import { useAllGroups } from '@/hooks/contacts/groups/query'
import { groupId } from '@/lib/core/utils/random'
import { useQueryClient } from '@tanstack/react-query'
import { groupKeys } from '@/hooks/contacts/groups/query'
import { contactKeys } from '@/hooks/contacts/shared/query'
import { agentToContact } from '@/lib/core/agent/types'

interface GroupCreationProps {
  onSuccess: () => void
}

export function GroupCreation({ onSuccess }: GroupCreationProps) {
  const { data: agents = [] } = useAllAgents()
  const { data: groups = [] } = useAllGroups()

  const queryClient = useQueryClient()
  const groupMutations = useGroupMutations()
  const { navigateToContactChat } = useAppNavigation()

  const [groupName, setGroupName] = useState(generateUniqueAgentName('Group'))
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleAgentToggle = (agentId: string) => {
    const newSelected = new Set(selectedAgents)
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId)
    } else {
      newSelected.add(agentId)
    }
    setSelectedAgents(newSelected)
  }

  const handleCreate = async () => {
    const trimmedName = groupName.trim()

    if (!trimmedName || selectedAgents.size === 0) return

    // Validate name format
    const validation = validateAgentName(trimmedName)
    if (!validation.valid) {
      setNameError(validation.error || 'Invalid name format')
      toast.error(validation.error || 'Invalid name format')
      return
    }

    // Check for duplicate names
    if (groups.some((g) => g.alias === trimmedName)) {
      setNameError('This name is already taken')
      toast.error('This name is already taken')
      return
    }

    setIsCreating(true)
    setNameError(null)
    const newGroupId = groupId()
    const now = Date.now()

    // 将选中的agent ID转换为Agent对象
    const selectedAgentObjects = agents.filter((agent) => selectedAgents.has(agent.id))

    groupMutations.createGroup.mutate(
      {
        id: newGroupId,
        alias: trimmedName,
        description: '',
        agents: selectedAgentObjects,
        pinned: false,
        shortcuts: [],
        sendToAllMembers: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: groupKeys.all })
          queryClient.invalidateQueries({ queryKey: contactKeys.all })
          onSuccess()
          navigateToContactChat(newGroupId)
        },
        onError: (error) => handleDatabaseError(error, { message: 'Failed to create group' }),
        onSettled: () => setIsCreating(false),
      },
    )
  }

  const canCreate = groupName.trim() && selectedAgents.size > 0 && !nameError

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setGroupName(newName)

    // Clear error when user starts typing
    if (nameError) {
      setNameError(null)
    }

    // Validate on change for immediate feedback
    if (newName.trim()) {
      const validation = validateAgentName(newName.trim())
      if (!validation.valid) {
        setNameError(validation.error || 'Invalid name format')
      } else if (groups.some((g) => g.alias === newName.trim())) {
        setNameError('This name is already taken')
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Group Name */}
      <div className="space-y-1.5">
        <MacOSLabel htmlFor="groupName" className="text-[12px] font-medium text-muted-foreground">
          Group Name
        </MacOSLabel>
        <MacOSInput
          id="groupName"
          type="text"
          value={groupName}
          onChange={handleNameChange}
          placeholder="Enter group name"
          error={!!nameError}
          className="w-full px-3 py-2"
        />
        {nameError && <p className="text-[11px] text-destructive mt-1">{nameError}</p>}
      </div>

      {/* Agent Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <MacOSLabel className="text-[12px] font-medium text-muted-foreground">
            Select Agents
          </MacOSLabel>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed border-border/30">
            <Users className="h-10 w-10 text-muted-foreground/20 mb-2" />
            <p className="text-[11px] text-muted-foreground/70">No agents available</p>
          </div>
        ) : (
          <MacOSScrollArea className="h-[320px] border rounded-lg border-border/20">
            <div className="p-1 space-y-px">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${
                    selectedAgents.has(agent.id) ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleAgentToggle(agent.id)}
                >
                  <MacOSCheckbox
                    checked={selectedAgents.has(agent.id)}
                    onCheckedChange={() => handleAgentToggle(agent.id)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-shrink-0">
                    <Avatar contact={agentToContact(agent)} size={28} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-[13px] font-normal truncate">{agent.alias}</div>
                    {agent.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-full">
                        {agent.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </MacOSScrollArea>
        )}
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <MacOSButton
          onClick={handleCreate}
          disabled={!canCreate || isCreating}
          className="min-w-[100px]"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Create
            </>
          )}
        </MacOSButton>
      </div>
    </div>
  )
}

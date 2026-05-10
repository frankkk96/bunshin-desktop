import { useState } from 'react'
import type { Group } from '@/lib/core/group/types'
import { agentToContact } from '@/lib/core/agent/types'
import { Plus, Users } from 'lucide-react'
import {
  MacOSSelect,
  MacOSSelectContent,
  MacOSSelectItem,
  MacOSSelectTrigger,
  MacOSSelectValue,
  MacOSButton,
} from '@/components/ui'
import { Avatar } from '@/components/common/Avatar/Avatar'
import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import { SettingDivider } from '@/components/features/Settings/components/SettingDivider'
import { useAllAgents } from '@/hooks/contacts/agents/query'
import { IoTrashOutline } from 'react-icons/io5'

interface GroupMembersManagerProps {
  group: Group
  onUpdate: (updates: Partial<Group>) => void
}

export function GroupMembersManager({ group, onUpdate }: GroupMembersManagerProps) {
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const { data: allAgents = [] } = useAllAgents()

  // group.agents 现在直接是 Agent[] 实体数组
  const currentMembers = group.agents || []

  // Filter available agents excluding already added members
  const currentMemberIds = currentMembers.map(m => m.id)
  const availableAgents = allAgents.filter((agent) => !currentMemberIds.includes(agent.id))

  // Member details 直接使用 currentMembers
  const memberDetails = currentMembers

  const handleAddMember = (memberId: string) => {
    const agentToAdd = allAgents.find(a => a.id === memberId)
    if (agentToAdd && !currentMemberIds.includes(memberId)) {
      const updatedMembers = [...currentMembers, agentToAdd]
      onUpdate({ agents: updatedMembers })
    }
    setIsSelecting(false)
  }

  const handleRemoveMember = (memberId: string) => {
    const updatedMembers = currentMembers.filter((agent) => agent.id !== memberId)
    onUpdate({ agents: updatedMembers })
  }

  return (
    <SettingSection title="Members" icon={Users}>
      {/* Current Members */}
      {memberDetails.map((member, index) => (
        <div key={member.id}>
          <SettingRow
            icon={<Avatar contact={agentToContact(member)} size={24} />}
            title={member.alias}
            description={member.description || 'Agent'}
          >
            <MacOSButton variant="icon" size="md" onClick={() => handleRemoveMember(member.id)}>
              <IoTrashOutline size={16} className="text-destructive" />
            </MacOSButton>
          </SettingRow>
          {index < memberDetails.length - 1 && <SettingDivider />}
        </div>
      ))}

      {/* Add Member Section */}
      {memberDetails.length > 0 && availableAgents.length > 0 && <SettingDivider />}

      {availableAgents.length > 0 && (
        <div className="relative">
          {!isSelecting ? (
            <SettingRow
              icon={<Plus className="w-4 h-4" />}
              title="Add Member"
              description={`${availableAgents.length} agents available`}
            >
              <MacOSButton
                variant="ghost"
                size="sm"
                onClick={() => setIsSelecting(true)}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </MacOSButton>
            </SettingRow>
          ) : (
            <SettingRow
              icon={<Plus className="w-4 h-4" />}
              title="Add Member"
              description="Choose an agent to add to this group"
            >
              <MacOSSelect
                value=""
                onValueChange={handleAddMember}
                open={isSelecting}
                onOpenChange={(open) => !open && setIsSelecting(false)}
              >
                <MacOSSelectTrigger className="h-6 w-36 text-xs border-border/60 bg-background/50">
                  <MacOSSelectValue placeholder="Choose agent..." />
                </MacOSSelectTrigger>
                <MacOSSelectContent>
                  {availableAgents.map((agent) => (
                    <MacOSSelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Avatar contact={agentToContact(agent)} size={16} />
                        <span className="truncate max-w-28">{agent.alias}</span>
                      </div>
                    </MacOSSelectItem>
                  ))}
                </MacOSSelectContent>
              </MacOSSelect>
            </SettingRow>
          )}
        </div>
      )}

      {/* Empty State */}
      {memberDetails.length === 0 && (
        <div className="relative">
          {!isSelecting ? (
            <SettingRow
              icon={<Users className="w-4 h-4" />}
              title="No members"
              description="Add agents to this group to start collaborating"
            >
              {availableAgents.length > 0 ? (
                <MacOSButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSelecting(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Agent
                </MacOSButton>
              ) : (
                <span className="text-xs text-muted-foreground">No agents available</span>
              )}
            </SettingRow>
          ) : (
            <SettingRow
              icon={<Users className="w-4 h-4" />}
              title="Add Member"
              description="Choose an agent to add to this group"
            >
              <MacOSSelect
                value=""
                onValueChange={handleAddMember}
                open={isSelecting}
                onOpenChange={(open) => !open && setIsSelecting(false)}
              >
                <MacOSSelectTrigger className="h-6 w-36 text-xs border-border/60 bg-background/50">
                  <MacOSSelectValue placeholder="Choose agent..." />
                </MacOSSelectTrigger>
                <MacOSSelectContent>
                  {availableAgents.map((agent) => (
                    <MacOSSelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Avatar contact={agentToContact(agent)} size={16} />
                        <span className="truncate max-w-28">{agent.alias}</span>
                      </div>
                    </MacOSSelectItem>
                  ))}
                </MacOSSelectContent>
              </MacOSSelect>
            </SettingRow>
          )}
        </div>
      )}
    </SettingSection>
  )
}

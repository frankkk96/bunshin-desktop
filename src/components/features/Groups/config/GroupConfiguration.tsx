import { MacOSSwitch } from '@/components/ui'
import type { Group } from '@/lib/core/group/types'
import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import { GroupMembersManager } from './GroupMembersManager'
import { PromptsSection } from './PromptsSection'
import { Shield } from 'lucide-react'

interface GroupConfigurationProps {
  group: Group
  onUpdate: (updates: Partial<Group>) => void
}

export function GroupConfiguration({ group, onUpdate }: GroupConfigurationProps) {
  const handleSendToAllMembersToggle = (enabled: boolean) => {
    onUpdate({
      sendToAllMembers: enabled,
    })
  }

  return (
    <div className="space-y-6">
      <GroupMembersManager group={group} onUpdate={onUpdate} />

      <PromptsSection group={group} onUpdate={onUpdate} />

      <SettingSection title="Group Config">
        <SettingRow
          icon={<Shield className="w-4 h-4" />}
          title="Send to All Members by Default"
          description="Send messages to all group members simultaneously by default"
        >
          <MacOSSwitch
            checked={group.sendToAllMembers || false}
            onCheckedChange={handleSendToAllMembersToggle}
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}

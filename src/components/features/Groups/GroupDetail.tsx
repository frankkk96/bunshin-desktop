import { useGroupById } from '@/hooks/contacts/groups/query'
import { useGroupMutations } from '@/hooks/contacts/groups/mutations'
import { GroupConfiguration } from './config/GroupConfiguration'
import { DeleteButton, DetailLayout, NotFoundView } from '@/components/common'
import { MacOSSeparator } from '@/components/ui'
import { GroupProfileSection } from './GroupProfileSection'

export function GroupDetail({ groupId }: { groupId: string }) {
  const { data: group } = useGroupById(groupId)
  const groupMutations = useGroupMutations()

  if (!group) {
    return <NotFoundView entityType="Group" />
  }

  return (
    <DetailLayout>
      <GroupProfileSection group={group} />
      <MacOSSeparator className="mb-8 bg-border opacity-30" />
      <GroupConfiguration
        group={group}
        onUpdate={(updates) => {
          groupMutations.updateGroup.mutate({ ...group, ...updates })
        }}
      />
      <MacOSSeparator className="mt-8 mb-8 bg-border opacity-30" />
      <div className="mb-8">
        <DeleteButton
          text="Delete Group"
          onDelete={() => groupMutations.deleteGroup.mutate(group.id)}
        />
      </div>
    </DetailLayout>
  )
}

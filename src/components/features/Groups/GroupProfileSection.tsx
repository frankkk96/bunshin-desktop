import type { Group } from '@/lib/core/group/types'
import { AvatarSection, PinButton } from '@/components/common'
import { GroupInfoSection } from './GroupInfoSection'
import { useContact } from '@/hooks/contacts/shared/query'

export function GroupProfileSection({ group }: { group: Group }) {
  const { data: contact } = useContact(group.id)
  if (!contact) {
    return null
  }
  return (
    <div className={`mb-10 relative`}>
      <div className="absolute top-0 right-0 z-10">
        <PinButton groupId={group.id} />
      </div>
      <div className="flex gap-6 items-center">
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <AvatarSection contact={contact} badgeText="GROUP" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          <GroupInfoSection group={group} />
        </div>
      </div>
    </div>
  )
}

import { MacOSBadge } from '@/components/ui'
import { Avatar } from '@/components/common'
import type { Contact } from '@/hooks/contacts/shared/types'

interface AvatarSectionProps {
  contact?: Contact
  badgeText?: string
}

export function AvatarSection({ contact, badgeText }: AvatarSectionProps) {
  if (!contact) {
    return null
  }

  const text = badgeText ?? (contact.type === 'group' ? 'GROUP' : 'AGENT')

  return (
    <>
      <Avatar contact={contact} size={100} />

      <MacOSBadge
        variant="outline"
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-muted text-muted-foreground border-border"
      >
        {text}
      </MacOSBadge>
    </>
  )
}

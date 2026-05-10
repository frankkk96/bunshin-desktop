import { Avatar } from '@/components/common'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { StatusTooltip } from './tooltips/StatusTooltip'

export function ContactInfo() {
  const { session, contact } = useSession()

  if (!session || !contact) {
    return null
  }

  const { navigateToContact } = useAppNavigation()

  return (
    <div className="flex items-center gap-3 ml-2.5 mr-0">
      {/* Avatar */}
      <div onClick={() => navigateToContact(contact.id)} className="hover:opacity-80">
        <Avatar contact={contact} size={30} className="cursor-pointer" />
      </div>

      {/* Contact Info & Description */}
      <div className="flex flex-col">
        <div
          className="font-medium text-sm cursor-pointer hover:opacity-75 flex items-center gap-2"
          onClick={() => navigateToContact(contact.id)}
        >
          <span>{contact.alias}</span>
          <StatusTooltip contactId={contact.id} />
        </div>

        {/* Contact Description */}
        {contact.description && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[300px]">
            {contact.description}
          </div>
        )}
      </div>
    </div>
  )
}

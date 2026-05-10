import { IoPushOutline } from 'react-icons/io5'
import type { Contact } from '@/hooks/contacts/shared/types'
import { Avatar } from '@/components/common'
import { cn } from '@/lib/ui/utils'

interface ContactItemProps {
  contact: Contact
  isSelected: boolean
  onSelect: (contactId: string) => void
}

export function ContactItem({ contact, isSelected, onSelect }: ContactItemProps) {
  return (
    <div
      onClick={() => onSelect(contact.id)}
      className={cn(
        'w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 text-left gap-2 !cursor-default flex items-center',
        isSelected && 'bg-accent',
      )}
    >
      {/* Avatar with type indicator */}
      <Avatar contact={contact} size={32} />

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-[1px]">
          <span
            className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-slate-900 dark:text-slate-100`}
          >
            {contact.alias}
          </span>
          <div className="flex items-center gap-1">
            {contact.pinned && (
              <IoPushOutline size={10} className={`flex-shrink-0 text-muted-foreground`} />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-muted-foreground`}
          >
            {contact.description}
          </span>
        </div>
      </div>
    </div>
  )
}

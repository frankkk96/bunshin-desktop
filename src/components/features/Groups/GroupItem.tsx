import { IoPushOutline } from 'react-icons/io5'
import type { Group } from '@/lib/core/group/types'
import { Avatar } from '@/components/common'
import { cn } from '@/lib/ui/utils'
import { useContact } from '@/hooks/contacts/shared/query'

interface GroupItemProps {
  group: Group
  isSelected: boolean
  onSelect: (contactId: string) => void
}

export function GroupItem({ group, isSelected, onSelect }: GroupItemProps) {
  const { data: contact, isLoading } = useContact(group.id)
  if (!contact) {
    return null
  }

  const memberCount = contact.agents.length

  return (
    <div
      onClick={() => onSelect(group.id)}
      className={cn(
        'w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 text-left gap-2 !cursor-default flex items-center',
        isSelected && 'bg-accent',
      )}
    >
      {/* Avatar */}
      {contact ? (
        <Avatar contact={contact} size={32} />
      ) : (
        <div className="w-8 h-8 rounded-sm bg-muted animate-pulse" aria-hidden />
      )}

      {/* Group Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-[1px]">
          <span
            className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1 ${
              isSelected
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {group.alias}
          </span>
          <div className="flex items-center gap-1">
            {group.pinned && (
              <IoPushOutline
                size={10}
                className={`flex-shrink-0 ${
                  isSelected
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-muted-foreground`}
          >
            {isLoading
              ? 'Loading members...'
              : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
            {group.sendToAllMembers && ' • Send to all'}
          </span>
        </div>
      </div>
    </div>
  )
}

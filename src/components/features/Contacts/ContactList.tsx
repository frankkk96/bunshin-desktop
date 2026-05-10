import { useEffect, useMemo } from 'react'
import type { Contact } from '@/hooks/contacts/shared/types'
import { ContactItem } from './'
import { useAllContacts } from '@/hooks/contacts/shared/query'

interface ContactListProps {
  searchValue: string
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
}

export function ContactList({ searchValue, selectedContactId, onSelectContact }: ContactListProps) {
  const {
    data: contacts = [],
    isLoading,
    error,
  } = useAllContacts()

  // 统一的过滤和排序逻辑
  const { filteredContacts, groupedContacts } = useMemo(() => {
    // 过滤contacts
    const filtered = contacts.filter((contact) => {
      const query = searchValue.toLowerCase()
      return (
        contact.alias.toLowerCase().includes(query) ||
        contact.description.toLowerCase().includes(query)
      )
    })

    // 按pinned状态和字母排序所有contacts（pinned优先）
    const sorted = filtered.sort((a, b) => {
      // 首先按pinned状态排序（pinned在前）
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // 如果pinned状态相同，按字母排序
      return a.alias.localeCompare(b.alias)
    })

    // 分组显示：先显示pinned contacts，再按首字母分组非pinned contacts
    const pinnedContacts = sorted.filter((contact) => contact.pinned)
    const unpinnedContacts = sorted.filter((contact) => !contact.pinned)

    // 按首字母分组非pinned contacts
    const unpinnedGrouped = unpinnedContacts.reduce((groups, contact) => {
      const firstLetter = contact.alias.charAt(0).toUpperCase()
      if (!groups[firstLetter]) {
        groups[firstLetter] = []
      }
      groups[firstLetter].push(contact)
      return groups
    }, {} as Record<string, Contact[]>)

    const grouped: Record<string, Contact[]> = {
      ...(pinnedContacts.length > 0 && { PINNED: pinnedContacts }),
      ...unpinnedGrouped,
    }

    return {
      filteredContacts: sorted,
      groupedContacts: grouped,
    }
  }, [contacts, searchValue])

  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      // 自动选择第一个contact
      if (filteredContacts.length > 0) {
        onSelectContact(filteredContacts[0].id)
      }
    }
  }, [contacts, selectedContactId, onSelectContact, filteredContacts])

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading contacts...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading contacts</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* 显示分组的contacts */}
        {Object.keys(groupedContacts)
          .sort((a, b) => {
            // PINNED 分组永远在最前面
            if (a === 'PINNED') return -1
            if (b === 'PINNED') return 1
            return a.localeCompare(b)
          })
          .map((letter) => (
            <div key={letter}>
              <h3
                className={`px-4 py-1 text-xs font-medium uppercase tracking-wide ${
                  letter === 'PINNED' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {letter === 'PINNED' ? '📌 Pinned' : letter}
              </h3>
              {groupedContacts[letter].map((contact) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContactId === contact.id}
                  onSelect={onSelectContact}
                />
              ))}
            </div>
          ))}

        {filteredContacts.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            {searchValue ? 'No contacts found' : 'No contacts yet'}
          </div>
        )}
      </div>
    </div>
  )
}

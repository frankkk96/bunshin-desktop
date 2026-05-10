import { useMemo } from 'react'
import type { Contact } from '@/hooks/contacts/shared/types'
import { useAllSessions } from '@/hooks/sessions/query'
import type { SessionMetadata } from '@/lib/tauri/repo/sessions'
import { useAllContacts } from '@/hooks/contacts/shared/query'

export interface RecentChat {
  sessionId: string
  contactId: string
  contact: Contact
  name: string
  lastMessage: string
  lastMessageTime: number
  pinned: boolean
}

function mapContactToRecentChat(contact: Contact, sessions: SessionMetadata[]): RecentChat | null {
  const contactSessions = sessions.filter((s) => s.contactId === contact.id)
  if (contactSessions.length === 0) return null

  // Select the most recently visited session for this contact
  const selectedSession = contactSessions.reduce((latest, current) => {
    // If no visitedAt, use updatedAt as fallback
    const latestTime = latest.visitedAt || latest.createdAt
    const currentTime = current.visitedAt || current.createdAt
    return currentTime > latestTime ? current : latest
  })

  if (!selectedSession) return null

  // Check if there are overlay messages for this session

  let lastMessage = selectedSession.lastMessage || ''
  let lastMessageTime = selectedSession.lastMessageTimestamp || selectedSession.createdAt

  return {
    sessionId: selectedSession.id,
    contactId: contact.id,
    contact: contact,
    name: contact.alias,
    lastMessage,
    lastMessageTime,
    pinned: contact.pinned,
  }
}

export function useRecentChats() {
  const { data: contacts = [], isLoading: contactsLoading } = useAllContacts()
  const { data: sessions = [], isLoading: sessionsLoading } = useAllSessions()

  const isLoading = contactsLoading || sessionsLoading

  const recentChats = useMemo(() => {
    if (isLoading) return []

    // Sort by pinned status first, then by last message time
    return contacts
      .map((contact) => mapContactToRecentChat(contact, sessions))
      .filter((chat): chat is RecentChat => chat !== null)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.lastMessageTime - a.lastMessageTime
      })
  }, [sessions, contacts, isLoading])

  return {
    recentChats,
    isLoading,
  }
}

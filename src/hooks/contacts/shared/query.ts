import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { agentsApi } from '@/lib/tauri/repo/agents'
import { groupsApi } from '@/lib/tauri/repo/groups'
import type { Contact } from '@/hooks/contacts/shared/types'
import { agentToContact } from '@/lib/core/agent/types'
import { groupToContact } from '@/lib/core/group/types'

// Query keys for shared contact operations
export const contactKeys = {
  all: ['contacts'] as const,
  byId: (contactId: string) => [...contactKeys.all, contactId] as const,
}

export function useAllContacts() {
  return useQuery({
    queryKey: contactKeys.all,
    queryFn: async (): Promise<Contact[]> => {
      const [allAgents, allGroups] = await Promise.all([agentsApi.getAll(), groupsApi.getAll()])

      const agentContacts = allAgents.map(agentToContact)
      const groupContacts = await Promise.all(allGroups.map((group) => groupToContact(group)))

      return [...agentContacts, ...groupContacts]
    },
  })
}

/**
 * Hook to get a single contact (agent or group) by ID
 * Returns the contact with unified Contact interface
 * Uses the same cache as useAllAgents and useAllGroups for consistency
 */
export function useContact(contactId: string) {
  return useQuery({
    queryKey: contactKeys.byId(contactId),
    queryFn: async () => {
      // First try to find as an agent
      try {
        const agent = await agentsApi.getById(contactId)
        if (agent) {
          return agentToContact(agent)
        }

        // Then try to find as a group contact snapshot
        const group = await groupsApi.getById(contactId)
        if (group) {
          return await groupToContact(group)
        }
      } catch (error) {
        return null
      }

      return null
    },
    enabled: !!contactId,
    placeholderData: keepPreviousData,
  })
}

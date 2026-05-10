/**
 * Contact and Agent Types
 * Core domain types for contacts, agents, and groups
 */

import { Prompt } from '../agent/types'
import type { Agent } from '@/lib/core/agent/types'
import type { Contact } from '@/hooks/contacts/shared/types'

export interface Group {
  id: string
  alias: string
  description: string
  agents: Agent[]
  pinned: boolean
  shortcuts: Prompt[]
  sendToAllMembers: boolean
  createdAt: number // timestamp in milliseconds
  updatedAt: number // timestamp in milliseconds
}

export async function groupToContact(group: Group): Promise<Contact> {
  // Generate description with member count if no custom description
  let description = group.description
  if (!description || description.trim() === '') {
    const memberCount = group.agents.length
    description = `${memberCount} member${memberCount !== 1 ? 's' : ''}`
    if (group.sendToAllMembers) {
      description += ' • Send to all'
    }
  }

  return {
    id: group.id,
    type: 'group',
    alias: group.alias,
    description,
    agents: group.agents,
    pinned: group.pinned,
    shortcuts: group.shortcuts,
  }
}

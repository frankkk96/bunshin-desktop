/**
 * Contact and Agent Types
 * Core domain types for contacts, agents, and groups
 */

import { Agent, Prompt } from '../../../lib/core/agent/types'

export type ContactType = 'agent' | 'group'

export type Contact = {
  id: string
  type: ContactType
  alias: string
  description: string
  agents: Agent[]
  pinned: boolean
  shortcuts: Prompt[]
}

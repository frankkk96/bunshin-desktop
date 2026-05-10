import { invoke } from '@tauri-apps/api/core'
import type { Agent } from '@/lib/core/agent/types'

/**
 * Agent management
 */
export const agentsApi = {
  /**
   * Get all agents
   */
  getAll: async (): Promise<Agent[]> => {
    return invoke<Agent[]>('get_all_agents')
  },

  /**
   * Get agent by ID
   */
  getById: async (agentId: string): Promise<Agent | null> => {
    return invoke<Agent | null>('get_agent_by_id', { agentId })
  },

  /**
   * Create a new agent
   */
  create: async (agent: Agent): Promise<Agent> => {
    return invoke<Agent>('create_agent', { agent })
  },

  /**
   * Update an existing agent
   */
  update: async (agent: Agent): Promise<Agent> => {
    return invoke<Agent>('update_agent', { agent })
  },

  /**
   * Delete an agent by ID
   */
  delete: async (agentId: string): Promise<void> => {
    return invoke<void>('delete_agent_by_id', { agentId })
  },
}

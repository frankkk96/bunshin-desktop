import { invoke } from '@tauri-apps/api/core'
import type { Agent, AgentConfig } from '@/lib/types'

export const agentsApi = {
  list: () => invoke<Agent[]>('list_agents'),
  get: (id: string) => invoke<Agent | null>('get_agent', { id }),
  create: (input: {
    alias: string
    description: string | null
    avatar: string | null
    baseUrl: string | null
    apiKey?: string
    config?: AgentConfig
  }) => invoke<Agent>('create_agent', { input }),
  update: (input: {
    id: string
    alias: string
    description: string | null
    avatar: string | null
    baseUrl: string | null
    // Empty/undefined leaves the stored key untouched.
    apiKey?: string
    // Omit to preserve the stored config; pass to replace it.
    config?: AgentConfig
  }) => invoke<Agent>('update_agent', { input }),
  delete: (id: string) => invoke<void>('delete_agent', { id }),
  duplicate: (id: string) => invoke<Agent>('duplicate_agent', { id }),
  setApiKey: (agentId: string, apiKey: string) =>
    invoke<void>('set_agent_api_key', { agentId, apiKey }),
  hasApiKey: (agentId: string) => invoke<boolean>('has_agent_api_key', { agentId }),
}

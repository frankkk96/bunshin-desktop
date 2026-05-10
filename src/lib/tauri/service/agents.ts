import { invoke } from '@tauri-apps/api/core'
import type { Agent } from '@/lib/types'

export const agentsApi = {
  list: () => invoke<Agent[]>('list_agents'),
  get: (id: string) => invoke<Agent | null>('get_agent', { id }),
  create: (input: {
    alias: string
    description: string | null
    avatar: string | null
    providerId: string
  }) => invoke<Agent>('create_agent', { input }),
  update: (input: {
    id: string
    alias: string
    description: string | null
    avatar: string | null
  }) => invoke<Agent>('update_agent', { input }),
  delete: (id: string) => invoke<void>('delete_agent', { id }),
}

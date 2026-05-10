import { useQueries, useQuery } from '@tanstack/react-query'
import { Agent } from '@/lib/core/agent/types'
import { agentsApi } from '@/lib/tauri/repo/agents'

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  byId: (agentId: string) => [...agentKeys.all, agentId] as const,
  readyStatus: (agentId: string) => [...agentKeys.byId(agentId), 'ready-status'] as const,
  status: (agentId: string, sessionId?: string) =>
    [...agentKeys.byId(agentId), 'status', sessionId || 'default'] as const,
}

// ========== Agent Queries ==========

/**
 * Hook to get all agents
 */
export function useAllAgents() {
  return useQuery({
    queryKey: [...agentKeys.all, 'combined'] as const,
    queryFn: () => agentsApi.getAll(),
  })
}

/**
 * Hook to get a single agent by ID
 */
export function useAgentById(agentId: string) {
  return useQuery({
    queryKey: [...agentKeys.byId(agentId), 'any'] as const,
    queryFn: () => agentsApi.getById(agentId),
    enabled: !!agentId,
  })
}

export function useAgentsByIds(ids: string[]): Agent[] {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...agentKeys.byId(id), 'any'] as const,
      queryFn: () => agentsApi.getById(id),
      enabled: !!id,
    })),
  })

  // 提取所有成功获取的 agents
  return results
    .map((result) => result.data)
    .filter((agent): agent is Agent => agent !== null && agent !== undefined)
}

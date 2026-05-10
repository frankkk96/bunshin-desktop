import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Agent } from '@/lib/core/agent/types'
import { agentKeys } from './query'
import { groupKeys } from '../groups/query'
import { contactKeys } from '../shared/query'
import { handleDatabaseError } from '@/lib/core/utils/error'
import { agentsApi } from '@/lib/tauri/repo/agents'

// 纯粹的 mutations - 只负责数据操作，不包含业务逻辑
export function useAgentMutations() {
  const queryClient = useQueryClient()

  const invalidateAllAgentQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: agentKeys.all })
    await queryClient.invalidateQueries({ queryKey: contactKeys.all })
    await queryClient.refetchQueries({ queryKey: agentKeys.all })
  }

  // ========== Agent Mutations ==========

  const createAgent = useMutation({
    mutationFn: (agent: Agent) => agentsApi.create(agent),
    onSuccess: (agent) => {
      invalidateAllAgentQueries()
      queryClient.invalidateQueries({ queryKey: contactKeys.byId(agent.id) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to create agent' })
    },
  })

  const updateAgent = useMutation({
    mutationFn: (agent: Agent) => agentsApi.update(agent),
    onSuccess: async (agent) => {
      await invalidateAllAgentQueries()
      // Also invalidate and refetch ALL group queries (including byId queries)
      // since groups store full agent entities and need to reflect updated agent info
      await queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'groups',
      })
      await queryClient.refetchQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'groups',
      })
      queryClient.invalidateQueries({ queryKey: contactKeys.byId(agent.id) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to update agent' })
    },
  })

  const deleteAgent = useMutation({
    mutationFn: (agentId: string) => agentsApi.delete(agentId),
    onSuccess: (_, agentId) => {
      invalidateAllAgentQueries()
      // Also invalidate group queries since backend removes agent from groups
      // and may delete empty groups
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.removeQueries({ queryKey: agentKeys.byId(agentId) })
      queryClient.removeQueries({ queryKey: contactKeys.byId(agentId) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to delete agent' })
    },
  })

  return {
    createAgent,
    updateAgent,
    deleteAgent,
  }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/tauri/service/agents'

const KEY = ['agents'] as const

export function useAgents() {
  return useQuery({ queryKey: KEY, queryFn: agentsApi.list })
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => agentsApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: agentsApi.update,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, data.id] })
    },
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDuplicateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => agentsApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useAgentApiKey(agentId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, agentId, 'api-key'],
    queryFn: () => agentsApi.getApiKey(agentId!),
    enabled: !!agentId,
    staleTime: Infinity,
  })
}

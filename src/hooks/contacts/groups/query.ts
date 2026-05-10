import { groupsApi } from '@/lib/tauri/repo/groups'
import { useQuery } from '@tanstack/react-query'

// Query keys
export const groupKeys = {
  all: ['groups'] as const,
  byId: (groupId: string) => [...groupKeys.all, groupId] as const,
}

export function useAllGroups() {
  return useQuery({
    queryKey: groupKeys.all,
    queryFn: () => groupsApi.getAll(),
  })
}

export function useGroupById(groupId: string) {
  return useQuery({
    queryKey: groupKeys.byId(groupId),
    queryFn: () => groupsApi.getById(groupId),
    enabled: !!groupId,
  })
}

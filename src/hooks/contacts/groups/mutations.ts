import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Group } from '@/lib/core/group/types'
import { groupKeys } from './query'
import { contactKeys } from '../shared/query'
import { handleDatabaseError } from '@/lib/core/utils/error'
import { groupsApi } from '@/lib/tauri/repo/groups'

export function useGroupMutations() {
  const queryClient = useQueryClient()

  const invalidateAllGroupQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: groupKeys.all })
    await queryClient.invalidateQueries({ queryKey: contactKeys.all })
    await queryClient.refetchQueries({ queryKey: groupKeys.all })
  }

  const createGroup = useMutation({
    mutationFn: (group: Group) => groupsApi.create(group),
    onSuccess: (group) => {
      invalidateAllGroupQueries()
      queryClient.invalidateQueries({ queryKey: contactKeys.byId(group.id) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to create group' })
    },
  })

  const updateGroup = useMutation({
    mutationFn: (group: Group) => groupsApi.update(group),
    onSuccess: (group) => {
      invalidateAllGroupQueries()
      queryClient.invalidateQueries({ queryKey: contactKeys.byId(group.id) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to update group' })
    },
  })

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) => groupsApi.delete(groupId),
    onSuccess: (_, groupId) => {
      invalidateAllGroupQueries()
      queryClient.removeQueries({ queryKey: groupKeys.byId(groupId) })
      queryClient.removeQueries({ queryKey: contactKeys.byId(groupId) })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to delete group' })
    },
  })

  return {
    createGroup,
    updateGroup,
    deleteGroup,
  }
}

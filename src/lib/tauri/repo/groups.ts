import { invoke } from '@tauri-apps/api/core'
import type { Group } from '@/lib/core/group/types'

/**
 * Group management
 */
export const groupsApi = {
  /**
   * Get all groups
   */
  getAll: async (): Promise<Group[]> => {
    return invoke<Group[]>('get_all_groups')
  },

  /**
   * Get group by ID
   */
  getById: async (groupId: string): Promise<Group | null> => {
    return invoke<Group | null>('get_group_by_id', { groupId })
  },

  /**
   * Create a new group
   */
  create: async (group: Group): Promise<Group> => {
    return invoke<Group>('create_group', { group })
  },

  /**
   * Update an existing group
   */
  update: async (group: Group): Promise<Group> => {
    return invoke<Group>('update_group', { group })
  },

  /**
   * Delete a group by ID
   */
  delete: async (groupId: string): Promise<void> => {
    return invoke<void>('delete_group_by_id', { groupId })
  },
}

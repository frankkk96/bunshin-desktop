import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { AppSettings, SettingsUpdate } from '@/hooks/settings/query'
import { settingsKeys } from './query'
import { toast } from '@/lib/core/utils/toast'
import { settings } from '@/lib/tauri/system/settings'
import { useEffect } from 'react'
import { logger } from '@/lib/core/utils/logger'

// Settings changed event from Rust backend
const SETTINGS_CHANGED_EVENT = 'settings:changed'

/**
 * Hook to listen to settings changes from other windows/backend
 * This ensures all windows stay in sync
 */
export function useSettingsChangeListener() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let unlisten: UnlistenFn | undefined

    const setupListener = async () => {
      try {
        unlisten = await listen<AppSettings>(SETTINGS_CHANGED_EVENT, (event) => {
          logger.info('Settings changed event received', { payload: event.payload })

          // Update the query cache with new settings
          queryClient.setQueryData(settingsKeys.app(), event.payload)
        })
      } catch (error) {
        logger.error('Failed to setup settings change listener', error as Error)
      }
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [queryClient])
}

/**
 * Hook for all settings mutations
 */
export function useSettingsMutations() {
  const queryClient = useQueryClient()

  const updateSettings = useMutation({
    mutationFn: (updates: SettingsUpdate) => settings.update(updates),
    onSuccess: (data) => {
      // Update local cache immediately
      queryClient.setQueryData(settingsKeys.app(), data)
      logger.info('Settings updated successfully')
    },
    onError: (error) => {
      logger.error('Failed to update settings', error as Error)
      toast.error('Failed to update settings')
    },
  })

  const resetSettings = useMutation({
    mutationFn: () => settings.reset(),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.app(), data)
      toast.success('Settings reset to defaults')
      logger.info('Settings reset to defaults')
    },
    onError: (error) => {
      logger.error('Failed to reset settings', error as Error)
      toast.error('Failed to reset settings')
    },
  })

  const exportSettings = useMutation({
    mutationFn: () => settings.export(),
    onError: (error) => {
      logger.error('Failed to export settings', error as Error)
      toast.error('Failed to export settings')
    },
  })

  const importSettings = useMutation({
    mutationFn: (jsonData: string) => settings.import(jsonData),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.app(), data)
      toast.success('Settings imported successfully')
      logger.info('Settings imported successfully')
    },
    onError: (error) => {
      logger.error('Failed to import settings', error as Error)
      toast.error('Failed to import settings')
    },
  })

  return {
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  }
}

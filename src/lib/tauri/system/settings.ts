import { invoke } from '@tauri-apps/api/core'
import type { AppSettings } from '@/hooks/settings/query'

export type { AppSettings }

/**
 * Settings management
 */
export const settings = {
  /**
   * Get application settings
   */
  get: async (): Promise<AppSettings> => {
    return invoke<AppSettings>('get_app_settings')
  },

  /**
   * Update application settings
   */
  update: async (updates: Partial<AppSettings>): Promise<AppSettings> => {
    return invoke<AppSettings>('update_app_settings', { updates })
  },

  /**
   * Reset application settings to defaults
   */
  reset: async (): Promise<AppSettings> => {
    return invoke<AppSettings>('reset_app_settings')
  },

  /**
   * Export settings as JSON
   */
  export: async (): Promise<string> => {
    return invoke<string>('export_app_settings')
  },

  /**
   * Import settings from JSON
   */
  import: async (jsonData: string): Promise<AppSettings> => {
    return invoke<AppSettings>('import_app_settings', { jsonData })
  },
}

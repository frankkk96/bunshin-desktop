import { invoke } from '@tauri-apps/api/core'

/**
 * Log and app info management
 */
export const logs = {
  /**
   * Read log file content
   */
  read: async (): Promise<string> => {
    return invoke<string>('read_log_file')
  },

  /**
   * Get application version
   */
  getVersion: async (): Promise<string> => {
    return invoke<string>('get_app_version')
  },
}

import { check, Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getVersion } from '@tauri-apps/api/app'
import { arch, platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'

/**
 * App Updater - 应用更新适配层
 *
 * 封装应用更新检查、下载、安装等业务功能
 */
export const app = {
  /**
   * 检查是否有可用更新
   */
  checkForUpdates: (): Promise<Update | null> => {
    return check()
  },

  /**
   * 重启应用
   */
  relaunch: (): Promise<void> => {
    return relaunch()
  },

  /**
   * 获取应用版本号
   */
  getVersion: (): Promise<string> => {
    return getVersion()
  },

  /**
   * 获取系统架构
   */
  getArch: (): string => {
    return arch()
  },

  /**
   * 获取操作系统平台
   */
  getPlatform: (): string => {
    return platform()
  },

  /**
   * Open a URL in the system's default browser
   */
  openUrl: async (url: string): Promise<void> => {
    await invoke('open_url', { url })
  },

  /**
   * Save export data to a file chosen by user
   */
  saveExportData: async (data: string, filename: string): Promise<boolean> => {
    return await invoke<boolean>('save_export_data', { data, filename })
  },

  /**
   * Export all application data (SQLite + KV store) as JSON
   */
  exportAllData: async (): Promise<string> => {
    return await invoke<string>('export_all_data')
  },
}

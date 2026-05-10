import { useQuery } from '@tanstack/react-query'
import { settings } from '@/lib/tauri/system/settings'

export type Theme = 'light' | 'dark' | 'system'

// 系统设置接口
export interface AppSettings {
  // 外观
  theme: Theme
  language: string

  // 系统功能
  autoUpdate: boolean
  crashReports: boolean
  maxConcurrency: number // 任务并发限制

  // 网络
  proxy: {
    enabled: boolean
    url: string
  }

  // 开发者选项
  debug: {
    enabled: boolean
    verboseLogging: boolean
  }
}

// 设置更新类型
export type SettingsUpdate = Partial<AppSettings>

// Settings query keys
export const settingsKeys = {
  all: ['settings'] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
}

/**
 * Hook to get app settings from Rust backend
 */
export function useAppSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.app(),
    queryFn: () => settings.get(),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 1,
  })
}

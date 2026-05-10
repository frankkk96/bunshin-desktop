import { useState, useEffect, useCallback } from 'react'
import { Update } from '@tauri-apps/plugin-updater'
import { updateService, UpdateStatus } from '@/lib/core/updater/update-service'
import { logger } from '@/lib/core/utils/logger'

interface UseUpdaterOptions {
  checkOnMount?: boolean
  autoCheckInterval?: number // 分钟
}

export function useUpdater(options: UseUpdaterOptions = {}) {
  const { checkOnMount = true, autoCheckInterval = 60 } = options

  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null)
  const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus())
  const [isChecking, setIsChecking] = useState(false)

  // 手动检查更新
  const checkForUpdates = useCallback(async (silent = false) => {
    try {
      setIsChecking(true)
      const update = silent
        ? await updateService.checkSilently() ? await updateService.checkForUpdates() : null
        : await updateService.checkForUpdates()

      setUpdateAvailable(update)
      return update
    } catch (error) {
      logger.error('Failed to check for updates', error as Error)
      if (!silent) {
        throw error
      }
      return null
    } finally {
      setIsChecking(false)
    }
  }, [])

  // 安装更新
  const installUpdate = useCallback(async (update: Update) => {
    try {
      await updateService.downloadAndInstall(update)
    } catch (error) {
      logger.error('Failed to install update', error as Error)
      throw error
    }
  }, [])

  // 监听状态变化
  useEffect(() => {
    const unsubscribe = updateService.onStatusChange(setStatus)
    return unsubscribe
  }, [])

  // 启动时检查更新
  useEffect(() => {
    if (checkOnMount) {
      // 延迟一点时间再检查，让应用先完成初始化
      const timer = setTimeout(() => {
        checkForUpdates(true) // 静默检查
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [checkOnMount, checkForUpdates])

  // 定时检查更新
  useEffect(() => {
    if (!autoCheckInterval) return

    const interval = setInterval(() => {
      checkForUpdates(true) // 静默检查
    }, autoCheckInterval * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoCheckInterval, checkForUpdates])

  return {
    updateAvailable,
    status,
    isChecking,
    checkForUpdates,
    installUpdate,
    // 便捷状态
    hasUpdate: !!updateAvailable,
    isDownloading: status.downloading,
    downloadProgress: status.progress,
    error: status.error
  }
}
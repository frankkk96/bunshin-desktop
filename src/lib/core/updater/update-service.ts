import { app } from '@/lib/tauri/system/app'
import { logger } from '@/lib/core/utils/logger'
import { toast } from 'sonner'
import { Update } from '@tauri-apps/plugin-updater'

interface UpdateProgress {
  downloaded: number
  total: number
  percentage: number
}

export interface UpdateStatus {
  available: boolean
  version?: string
  notes?: string
  downloading: boolean
  progress?: UpdateProgress
  error?: string
}

class UpdateService {
  private updateStatus: UpdateStatus = {
    available: false,
    downloading: false,
  }

  private listeners = new Set<(status: UpdateStatus) => void>()

  /**
   * 检查是否有可用更新
   */
  async checkForUpdates(): Promise<Update | null> {
    try {
      const update = await app.checkForUpdates()
      if (update) {
        this.updateStatus = {
          available: true,
          version: update.version,
          notes: update.body || 'No release notes available',
          downloading: false,
        }

        logger.info(`Update available: ${JSON.stringify(update)}`)
        this.notifyStatusChange()
        return update
      } else {
        this.updateStatus = {
          available: false,
          downloading: false,
        }
        logger.info('No updates available')
        this.notifyStatusChange()
        return null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const currentVersion = await app.getVersion()
      const currentArch = app.getArch()
      const currentPlatform = app.getPlatform()
      const target = `${currentPlatform}-${currentArch}`

      logger.error('Failed to check for updates', {
        error: error as Error,
        errorMessage,
        currentVersion,
        platform: currentPlatform,
        arch: currentArch,
        target,
        endpoint: 'https://github.com/frankkk96/Bunshin-Release/releases/latest/download/latest.json',
        details:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      })

      this.updateStatus = {
        available: false,
        downloading: false,
        error: errorMessage,
      }
      this.notifyStatusChange()
      throw error
    }
  }

  /**
   * 下载并安装更新
   */
  async downloadAndInstall(update: Update): Promise<void> {
    try {
      this.updateStatus = {
        ...this.updateStatus,
        downloading: true,
        progress: { downloaded: 0, total: 0, percentage: 0 },
      }
      this.notifyStatusChange()

      logger.info('Starting update download...')

      let totalSize = 0
      let downloadedSize = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            logger.info('Update download started', event.data)
            totalSize = (event.data as any).contentLength || 0
            downloadedSize = 0
            this.updateStatus = {
              ...this.updateStatus,
              progress: { downloaded: 0, total: totalSize, percentage: 0 },
            }
            this.notifyStatusChange()
            break

          case 'Progress':
            const data = event.data as any
            logger.debug('Download progress event:', data)

            // chunkLength 是当前块的大小，需要累加
            const chunkLength = data.chunkLength || 0
            downloadedSize += chunkLength

            // 确保使用正确的总大小
            if (!totalSize && data.contentLength) {
              totalSize = data.contentLength
            }

            const percentage = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0

            logger.debug(`Download progress: ${downloadedSize}/${totalSize} (${percentage}%)`)

            this.updateStatus = {
              ...this.updateStatus,
              progress: {
                downloaded: downloadedSize,
                total: totalSize,
                percentage,
              },
            }
            this.notifyStatusChange()
            break

          case 'Finished':
            logger.info('Update download completed')
            this.updateStatus = {
              ...this.updateStatus,
              downloading: false,
              progress: undefined,
            }
            this.notifyStatusChange()
            break
        }
      })

      logger.info('Update installed successfully, preparing to restart...')
      toast.success('Update installed! Restarting application...')

      // 延迟重启，让用户看到成功消息
      setTimeout(async () => {
        try {
          logger.info('Calling relaunch...')
          await app.relaunch()
        } catch (error) {
          toast.error('Failed to restart. Error: ' + JSON.stringify(error))
        }
      }, 1500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error('Failed to download and install update', error as Error)

      this.updateStatus = {
        ...this.updateStatus,
        downloading: false,
        progress: undefined,
        error: errorMessage,
      }
      this.notifyStatusChange()

      toast.error(`Update failed: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 静默检查更新（不显示 toast）
   */
  async checkSilently(): Promise<boolean> {
    try {
      const update = await this.checkForUpdates()
      return !!update
    } catch (error) {
      const currentVersion = await app.getVersion()
      const currentArch = app.getArch()
      const currentPlatform = app.getPlatform()
      const target = `${currentPlatform}-${currentArch}`

      logger.warn('Silent update check failed', {
        error: error as Error,
        currentVersion,
        platform: currentPlatform,
        arch: currentArch,
        target,
        endpoint: 'https://github.com/frankkk96/Bunshin-Release/releases/latest/download/latest.json',
      })
      return false
    }
  }

  /**
   * 订阅更新状态变化
   */
  onStatusChange(callback: (status: UpdateStatus) => void): () => void {
    this.listeners.add(callback)

    // 立即调用一次，返回当前状态
    callback(this.updateStatus)

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 获取当前更新状态
   */
  getStatus(): UpdateStatus {
    return { ...this.updateStatus }
  }

  private notifyStatusChange(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.updateStatus)
      } catch (error) {
        logger.error('Error in update status callback', error as Error)
      }
    })
  }
}

export const updateService = new UpdateService()

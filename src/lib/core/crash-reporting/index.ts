import { logger } from '@/lib/core/utils/logger'
import { submitLogsToBackend } from '@/lib/core/utils/crash'

/**
 * 简化的错误捕获系统
 * 捕获全局错误、记录到日志并自动提交到后端
 */
class SimpleCrashReporting {
  private initialized = false
  private submissionInProgress = false
  private lastSubmissionTime = 0
  private readonly MIN_SUBMISSION_INTERVAL = 5000 // 最小提交间隔 5 秒，避免频繁提交

  constructor() {
    this.setupGlobalErrorHandlers()
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      logger.info('Error reporting initialized')
      this.initialized = true
    } catch (error) {
      logger.error('Failed to initialize error reporting', error)
      throw error
    }
  }

  private setupGlobalErrorHandlers(): void {
    // JavaScript 错误捕获
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message)
      this.captureError(error, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Promise rejection 捕获
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      this.captureError(error, {
        type: 'unhandled_promise',
      })
    })

    // 资源加载错误
    window.addEventListener(
      'error',
      (event) => {
        if (event.target && event.target !== window) {
          this.captureError(
            new Error(`Resource loading failed: ${(event.target as any)?.src || 'unknown'}`),
            {
              type: 'resource',
            },
          )
        }
      },
      true,
    )
  }

  async captureError(
    error: Error,
    metadata?: {
      type?: string
      componentStack?: string
      filename?: string
      lineno?: number
      colno?: number
    },
  ): Promise<void> {
    try {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        type: metadata?.type,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }

      // 记录错误到日志系统
      await logger.error(`[${metadata?.type || 'error'}] ${error.message}`, errorInfo)

      // 自动提交崩溃报告到后端（带防抖）
      await this.submitCrashReportWithDebounce()
    } catch (reportError) {
      // 不要在这里再次抛出错误，避免无限循环
      console.error('Failed to report error:', reportError)
    }
  }

  /**
   * 带防抖的崩溃报告提交
   * 避免短时间内多次错误导致频繁提交
   */
  private async submitCrashReportWithDebounce(): Promise<void> {
    const now = Date.now()

    // 检查是否在最小提交间隔内
    if (now - this.lastSubmissionTime < this.MIN_SUBMISSION_INTERVAL) {
      logger.info('Skipping crash report submission (too soon since last submission)')
      return
    }

    // 检查是否已经有提交在进行中
    if (this.submissionInProgress) {
      logger.info('Skipping crash report submission (submission already in progress)')
      return
    }

    try {
      this.submissionInProgress = true
      this.lastSubmissionTime = now

      // 等待一小段时间，确保日志已经写入文件
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 提交到后端
      await submitLogsToBackend()
      logger.info('Crash report submitted successfully')
    } catch (error) {
      logger.error('Failed to submit crash report', error)
    } finally {
      this.submissionInProgress = false
    }
  }

  // React Error Boundary 集成
  captureReactError(error: Error, errorInfo: { componentStack: string }): void {
    this.captureError(error, {
      type: 'react',
      componentStack: errorInfo.componentStack,
    })
  }

  destroy(): void {
    this.initialized = false
  }
}

// 单例实例
let crashReportingInstance: SimpleCrashReporting | null = null

export function getCrashReporting(): SimpleCrashReporting {
  if (!crashReportingInstance) {
    crashReportingInstance = new SimpleCrashReporting()
  }
  return crashReportingInstance
}

// 便捷的静态方法
export const CrashReporting = {
  async init() {
    const instance = getCrashReporting()
    await instance.init()
    return instance
  },

  captureError(error: Error, metadata?: any) {
    return getCrashReporting().captureError(error, metadata)
  },

  captureReactError(error: Error, errorInfo: { componentStack: string }) {
    getCrashReporting().captureReactError(error, errorInfo)
  },
}

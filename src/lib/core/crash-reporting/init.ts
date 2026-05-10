import { CrashReporting } from './index'
import { logger } from '@/lib/core/utils/logger'
import { attachConsole } from '@tauri-apps/plugin-log'

/**
 * 初始化错误上报系统
 */
export async function initCrashReporting(): Promise<void> {
  try {
    // 附加控制台，启用前端日志到文件
    // 这会将前端的 logger.info/warn/error 等日志也写入到后端日志文件
    await attachConsole()

    logger.info('Initializing error reporting...')

    // 初始化错误捕获系统
    await CrashReporting.init()

    logger.info('Error reporting initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize error reporting', error as Error)

    // 即使初始化失败，也不要阻止应用启动
    logger.info('Application will continue without error reporting')
  }
}

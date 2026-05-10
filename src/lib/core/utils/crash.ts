import { logs as logsService } from '@/lib/tauri/system/logs'
import { fetch } from '@tauri-apps/plugin-http'
import { invoke } from '@tauri-apps/api/core'
import { logger } from './logger'
import { arch, platform, version } from '@tauri-apps/plugin-os'

/**
 * 日志上报工具
 */

// Types matching api.yaml schema
export interface CrashReport {
  id: string
  timestamp: string
  appVersion: string
  platform: string
  error: {
    message: string
    stack?: string
    type: 'javascript' | 'tauri' | 'network' | 'unhandled' | 'react'
    componentStack?: string
    filename?: string
    lineno?: number
    colno?: number
  }
  context: {
    sessionId: string
    userId?: string
    url: string
    userAgent: string
    lastActions: string[]
    logs: Array<{
      timestamp: string
      level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
      file: string
      message: string
      data?: any
    }>
  }
  system: {
    os: string
    arch: string
    version: string
    memory?: string
  }
}

export interface CrashReportRequest {
  reports: CrashReport[]
}

export interface CrashReportResponse {
  success: boolean
  received: number
  errors?: string[]
}

/**
 * 读取应用日志文件
 */
export async function readLogFile(): Promise<string> {
  try {
    const logContent = await logsService.read()
    return logContent
  } catch (error) {
    logger.error('Failed to read log file', error)
    throw error
  }
}

/**
 * 触发测试崩溃（用于测试日志系统）
 */
export async function triggerTestCrash(): Promise<void> {
  try {
    // 在前端记录测试日志
    logger.info('=== Test Crash Started ===')
    logger.warn('This is a simulated warning')
    logger.error('This is a simulated error', new Error('Test error from frontend'))

    // 在后端也记录测试日志
    await invoke('trigger_test_crash')

    // 模拟一些 JavaScript 错误
    const testError = new Error('Simulated crash for testing')
    testError.stack = `Error: Simulated crash for testing
    at triggerTestCrash (log-reporter.ts:45:25)
    at handleTestClick (Sidebar.tsx:35:10)`

    logger.error('Test crash completed', testError)
  } catch (error) {
    logger.error('Failed to trigger test crash', error)
    throw error
  }
}

/**
 * 解析日志文本并转换为结构化格式
 * 支持 Tauri 日志格式: [2025-10-24][10:27:58][INFO][tauri_app_lib] message
 */
function parseLogsToStructured(logContent: string): CrashReport['context']['logs'] {
  const logs: CrashReport['context']['logs'] = []
  const lines = logContent.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // 解析 Tauri 日志格式: [2025-10-24][10:27:58][INFO][tauri_app_lib] message
    // 或 webview 格式: [2025-10-24][10:27:58][INFO][webview:info@http://localhost:1420/src/file.ts:53:16] message
    const match = line.match(
      /^\[(\d{4}-\d{2}-\d{2})\]\[([^\]]+)\]\[(DEBUG|INFO|WARN|ERROR)\]\[([^\]]+)\]\s*(.*)/,
    )

    if (match) {
      const [, date, time, level, file, message] = match
      // 将日期和时间转换为 ISO 格式
      const timestamp = new Date(`${date}T${time}`).toISOString()

      logs.push({
        timestamp,
        level: level as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
        file: file,
        message: message.trim(),
      })
    }
  }

  return logs
}

/**
 * 提交日志到远程服务器
 */
export async function submitLogsToBackend(
  endpoint: string = 'https://server.bunshin.app/telemetry/crash-reports',
): Promise<CrashReportResponse> {
  try {
    logger.info('Starting log submission...')

    // 读取日志文件
    const logContent = await readLogFile()

    if (!logContent || logContent.trim().length === 0) {
      logger.warn('No logs to submit')
      throw new Error('No logs available')
    }

    // 获取系统信息
    const systemInfo = {
      os: platform(),
      arch: arch(),
      version: version(),
    }

    // 解析日志为结构化格式
    const structuredLogs = parseLogsToStructured(logContent)

    // 构建 CrashReport
    const crashReport: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      appVersion: await getAppVersion(),
      platform: systemInfo.os,
      error: {
        message: 'Manual log submission via crash test',
        type: 'unhandled',
        stack: 'Test crash triggered by user',
      },
      context: {
        sessionId: getSessionId(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        lastActions: ['Test crash button clicked'],
        logs: structuredLogs,
      },
      system: systemInfo,
    }

    // 构建请求
    const payload: CrashReportRequest = {
      reports: [crashReport],
    }

    // 提交到后端
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to submit logs: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const result: CrashReportResponse = await response.json()
    return result
  } catch (error) {
    logger.error('Failed to submit logs to backend', error)
    throw error
  }
}

/**
 * 获取应用版本
 */
async function getAppVersion(): Promise<string> {
  try {
    return await logsService.getVersion()
  } catch {
    return 'unknown'
  }
}

/**
 * 获取或生成 Session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('app_session_id')

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem('app_session_id', sessionId)
  }

  return sessionId
}

/**
 * 测试完整流程：触发崩溃 -> 读取日志 -> 提交
 */
export async function testCrashAndSubmit(endpoint?: string): Promise<void> {
  try {
    logger.info('=== Starting crash test flow ===')

    // 1. 触发测试崩溃
    await triggerTestCrash()

    // 2. 等待日志写入
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 3. 读取日志
    const logs = await readLogFile()
    logger.info(`Read ${logs.length} bytes of logs`)

    // 4. 提交到后端（如果提供了 endpoint）
    if (endpoint) {
      const result = await submitLogsToBackend(endpoint)
      logger.info(`Successfully submitted ${result.received} crash report(s)`)
      if (result.errors && result.errors.length > 0) {
        logger.warn('Some errors occurred:', result.errors)
      }
    } else {
      // 开发环境：只显示日志内容
      logger.info('Log content preview:', logs.slice(-500)) // 显示最后 500 字符
      console.log(logs)
      console.groupEnd()
    }

    logger.info('=== Crash test flow completed ===')
  } catch (error) {
    logger.error('Crash test flow failed', error)
    throw error
  }
}

import { debug, info, warn, error as logError } from '@tauri-apps/plugin-log'

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string
  level: string
  file: string
  message: string
  data?: any
}

class TauriLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private minLevel = LogLevel.INFO

  private getCallerFile(): string {
    try {
      const err = new Error()
      const stack = err.stack?.split('\n') || []

      // Find the first stack frame that's not from logger.ts
      for (let i = 2; i < stack.length; i++) {
        const line = stack[i]
        if (!line.includes('logger.ts') && !line.includes('logger.js')) {
          // Extract filename from stack trace
          const match = line.match(/(?:at\s+.*?\s+\()?(?:.*\/)?([^\/\s]+\.[tj]sx?):?\d*:?\d*/)
          if (match) {
            return match[1].replace(/\?.*$/, '') // Remove query params
          }
        }
      }
    } catch (e) {
      // Fallback if stack trace parsing fails
    }
    return 'unknown'
  }

  private addToMemory(level: LogLevel, message: string, data?: any): void {
    const file = this.getCallerFile()
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      file,
      message,
      data,
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 在浏览器控制台也输出（带颜色）
    const color = ['gray', 'blue', 'orange', 'red'][level]
    const prefix = `[${entry.timestamp}] [${entry.level}] [${file}]`
    console.log(`%c${prefix}`, `color: ${color}`, message, data || '')
  }

  async debug(message: string, data?: any): Promise<void> {
    if (LogLevel.DEBUG < this.minLevel) return

    this.addToMemory(LogLevel.DEBUG, message, data)

    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message
    await debug(logMessage)
  }

  async info(message: string, data?: any): Promise<void> {
    if (LogLevel.INFO < this.minLevel) return

    this.addToMemory(LogLevel.INFO, message, data)

    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message
    await info(logMessage)
  }

  async warn(message: string, data?: any): Promise<void> {
    if (LogLevel.WARN < this.minLevel) return

    this.addToMemory(LogLevel.WARN, message, data)

    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message
    await warn(logMessage)
  }

  async error(message: string, errorData?: any): Promise<void> {
    const data =
      errorData instanceof Error
        ? { message: errorData.message, stack: errorData.stack }
        : errorData

    this.addToMemory(LogLevel.ERROR, message, data)

    const logMessage = `${message} ${JSON.stringify(data)}`
    await logError(logMessage)
  }

  serialize(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level
  }
}

export const logger = new TauriLogger()

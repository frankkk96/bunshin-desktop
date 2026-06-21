import { logger } from './logger'
import { toast } from '@/lib/core/utils/toast'

interface ErrorOptions {
  component?: string
  function?: string
  metadata?: Record<string, any>
  silent?: boolean
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return String(error)
}

function getCallerInfo(): { component: string; function: string } {
  try {
    const err = new Error()
    const stack = err.stack?.split('\n') || []

    // Find the first stack frame that's not from error-handler.ts
    for (let i = 3; i < stack.length; i++) {
      const line = stack[i]
      if (!line.includes('error-handler.ts') && !line.includes('error-handler.js')) {
        // Extract component (filename) and function name
        // Match patterns like: "at functionName (/path/to/Component.tsx:123:45)"
        const functionMatch = line.match(/at\s+([^(\s]+)/)
        const fileMatch = line.match(/(?:.*\/)?([^\/\s]+\.[tj]sx?):?\d*:?\d*/)

        const functionName = functionMatch?.[1] || 'anonymous'
        const component = fileMatch?.[1]?.replace(/\.[tj]sx?$/, '') || 'unknown'

        return { component, function: functionName }
      }
    }
  } catch (e) {
    // Fallback if stack trace parsing fails
  }
  return { component: 'unknown', function: 'unknown' }
}

function logAndToast(message: string, options: ErrorOptions = {}) {
  const callerInfo = getCallerInfo()

  const enrichedOptions = {
    component: options.component || callerInfo.component,
    function: options.function || callerInfo.function,
    ...options,
  }

  // 如果有详细的metadata，也记录到日志中
  if (options.metadata) {
    logger.error(message, enrichedOptions)
    logger.error('Error details:', options.metadata)
  } else {
    logger.error(message, enrichedOptions)
  }

  if (!options.silent) {
    // 对于开发环境，在toast中也显示一些关键信息
    let toastMessage = message
    if (options.metadata && import.meta.env.DEV) {
      const keyInfo = []
      if (options.metadata.agentsCount !== undefined) {
        keyInfo.push(`Agents: ${options.metadata.agentsCount}`)
      }
      if (options.metadata.providersCount !== undefined) {
        keyInfo.push(`Providers: ${options.metadata.providersCount}`)
      }
      if (options.metadata.requestedAgentId) {
        keyInfo.push(`Agent ID: ${options.metadata.requestedAgentId}`)
      }
      if (keyInfo.length > 0) {
        toastMessage += ` (${keyInfo.join(', ')})`
      }
    }
    toast.error(toastMessage)
  }
}

// 简化的参数类型
type SimpleErrorOptions = {
  message?: string // 自定义错误消息
  silent?: boolean // 是否静默（不显示toast）
  metadata?: Record<string, any> // 额外的调试信息
}

export function handleRuntimeError(error: unknown, options: SimpleErrorOptions = {}) {
  const message = options.message || normalizeError(error) || 'Runtime error occurred'
  logAndToast(message, options)
}

import { TaskParams } from '../types'
import {
  TaskExecutionError,
  TaskCancellationError,
  NetworkError,
  RateLimitError,
  ProviderConfigurationRequiredError,
} from './types'

function buildMessage(error: Error, context?: string): string {
  if (!context) {
    return error.message
  }

  if (!error.message) {
    return context
  }

  return `${context}: ${error.message}`
}

function matches(message: string, keywords: string[]): boolean {
  return keywords.some((keyword) => message.includes(keyword))
}

function classifyError(error: Error, taskParams: TaskParams, context?: string): TaskExecutionError {
  const contextMessage = buildMessage(error, context)
  const message = error.message?.toLowerCase() ?? ''
  const name = error.name?.toLowerCase() ?? ''

  // Check HTTP status codes
  const status = (error as unknown as { status?: unknown }).status
  if (typeof status === 'number') {
    if (status === 403) {
      return new ProviderConfigurationRequiredError(taskParams)
    }

    if (status === 429) {
      return new RateLimitError(taskParams)
    }

    if (status >= 500 && status < 600) {
      return new NetworkError(taskParams)
    }
  }

  // Cancellation by name
  if (name === 'aborterror' || name === 'taskcancellationerror') {
    return new TaskCancellationError(taskParams)
  }

  // Cancellation by message hint
  if (matches(message, ['cancelled', 'canceled', 'aborted'])) {
    return new TaskCancellationError(taskParams)
  }

  // Network errors
  if (
    matches(message, [
      'network',
      'timeout',
      'econnrefused',
      'enotfound',
      'essl',
      'unreachable',
      '503',
      '502',
      '504',
    ])
  ) {
    return new NetworkError(taskParams)
  }

  // Rate limiting
  if (matches(message, ['rate limit', '429', 'too many requests'])) {
    return new RateLimitError(taskParams)
  }

  // Configuration / permission issues
  if (
    matches(message, [
      'configuration',
      'not configured',
      'provider',
      'permission',
      'forbidden',
      'quota',
      'exceeded',
      'api key',
    ])
  ) {
    return new ProviderConfigurationRequiredError(taskParams)
  }

  // Default to generic execution error
  return new TaskExecutionError('Execution Error', contextMessage, taskParams)
}

/**
 * Converts an unknown error to an ExecutionError.
 * If the error is already an ExecutionError or its subclass, returns it directly.
 * Otherwise, classifies the error and returns the appropriate ExecutionError type.
 */
export function toError(
  error: unknown,
  taskParams: TaskParams,
  context?: string,
): TaskExecutionError {
  // If already an ExecutionError or subclass, return directly
  if (error instanceof TaskExecutionError) {
    return error
  }

  // Convert to Error if not already
  const err = error instanceof Error ? error : new Error(String(error))

  // Classify and return appropriate error type
  return classifyError(err, taskParams, context)
}

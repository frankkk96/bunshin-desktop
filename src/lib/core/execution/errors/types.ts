import { TaskParams } from '../types'

export class TaskExecutionError extends Error {
  readonly title: string
  readonly message: string
  readonly task: TaskParams

  constructor(title: string, message: string, task: TaskParams) {
    super(message)
    this.title = title
    this.message = message
    this.task = task
  }
}

export class TaskCancellationError extends TaskExecutionError {
  constructor(task: TaskParams) {
    const title = 'Task Cancellation Error'
    const message = 'The task was cancelled'
    super(title, message, task)
  }
}

export class AgentNotFoundError extends TaskExecutionError {
  constructor(task: TaskParams) {
    const title = 'Agent Not Found'
    const message = `The agent (id: ${task.agentId}) was not found`
    super(title, message, task)
  }
}

export type ErrorAction = 'login' | 'configure-agent' | 'retry'

export class ActionableError extends TaskExecutionError {
  readonly label: string
  readonly action: ErrorAction

  constructor(
    title: string,
    message: string,
    task: TaskParams,
    label: string,
    action: ErrorAction,
  ) {
    super(title, message, task)
    this.label = label
    this.action = action
  }
}

export class RetryableError extends TaskExecutionError {
  readonly retryable: boolean
  constructor(title: string, message: string, task: TaskParams) {
    super(title, message, task)
    this.retryable = true
  }
}

export class NetworkError extends RetryableError {
  constructor(task: TaskParams) {
    const title = 'Network Error'
    const message = 'Please check your network connection and try again'
    super(title, message, task)
  }
}

export class RateLimitError extends RetryableError {
  constructor(task: TaskParams) {
    const title = 'Rate Limit Error'
    const message = 'Please try again later'
    super(title, message, task)
  }
}

export class LoginRequiredError extends ActionableError {
  constructor(task: TaskParams) {
    const title = 'Login Required'
    const message = 'Please login to continue'
    const label = 'Login'
    const action: ErrorAction = 'login'
    super(title, message, task, label, action)
  }
}

export class ProviderNotFoundError extends ActionableError {
  constructor(task: TaskParams) {
    const title = 'Provider Not Found'
    const message = 'Please select a provider to continue'
    const label = 'Select Provider'
    const action: ErrorAction = 'configure-agent'
    super(title, message, task, label, action)
  }
}

export class ProviderConfigurationRequiredError extends ActionableError {
  constructor(task: TaskParams) {
    const title = 'Provider Configuration Required'
    const message = 'Please configure the provider to continue'
    const label = 'Configure Provider'
    const action: ErrorAction = 'configure-agent'
    super(title, message, task, label, action)
  }
}

export class ModelNotFoundError extends ActionableError {
  constructor(task: TaskParams) {
    const title = 'Model Not Found'
    const message = 'Please select a model to continue'
    const label = 'Select Model'
    const action: ErrorAction = 'configure-agent'
    super(title, message, task, label, action)
  }
}

export class ExtensionConfigurationRequiredError extends ActionableError {
  constructor(task: TaskParams, extensionId: string) {
    const title = 'Extension Configuration Required'
    const message = `Please configure the extension ${extensionId} to continue`
    const label = 'Configure Extension'
    const action: ErrorAction = 'configure-agent'
    super(title, message, task, label, action)
  }
}

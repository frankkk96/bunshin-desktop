import { agentsApi } from '@/lib/tauri/repo/agents'
import {
  ActionableError,
  AgentNotFoundError,
  ExtensionConfigurationRequiredError,
  ModelNotFoundError,
  ProviderNotFoundError,
  TaskCancellationError,
  TaskExecutionError,
} from './errors/types'
import { providerService } from '../providers/provider-service'
import { extensionService } from '../extensions/extension-service'
import { toError } from './errors/classify'
import { logger } from '../utils/logger'
import { ResponseMessage } from '@/lib/core/messages/types'
import { taskId } from '../utils/random'
import { TaskParams, TaskSnapshot } from './types'
import { eventBus } from '../events/event-bus'
import { EventChunk, MessageEventType, StreamEvent } from '../events/message'
import { WorkflowEventType } from '../events/workflow'
import { ExtensionTool } from '../extensions/types'
import { ErrorEventType } from '../events/error'

export class Task {
  private _params: TaskParams
  private _id: string
  private _cancelled: boolean = false
  private _abortController: AbortController

  private _startTime?: number
  private _endTime?: number
  private _error?: string

  constructor(params: TaskParams) {
    this._params = params
    this._id = params.id ?? taskId()
    this._abortController = new AbortController()
    this._startTime = undefined
    this._endTime = undefined
    this._error = undefined
    logger.info('Task created', { params })

    this.run()
  }

  public get id(): string {
    return this._id
  }

  public get startTime(): number | undefined {
    return this._startTime
  }

  public get endTime(): number | undefined {
    return this._endTime
  }

  public get error(): string | undefined {
    return this._error
  }

  public get params(): TaskParams {
    return this._params
  }

  /**
   * 发送错误事件（仍需前端发送，因为后端不知道具体错误类型）
   */
  protected emitErrorEvent(event: EventChunk): void {
    const timestamp = Date.now()
    const fullEvent: StreamEvent = {
      sessionId: this.params.sessionId,
      agentId: this.params.agentId,
      queryId: this.params.queryId,
      created: timestamp,
      round: this.params.round,
      chunk: event,
    }
    eventBus.emit(MessageEventType.StreamEvent, fullEvent)
  }

  private taskPending(): void {
    eventBus.emit(WorkflowEventType.TaskPending, {
      sessionId: this.params.sessionId,
      agentId: this.params.agentId,
      round: this.params.round,
      queryId: this.params.queryId,
      taskId: this.id,
    })
  }

  private taskDone(status: 'succeeded' | 'failed' | 'cancelled' | 'pending_approval'): void {
    eventBus.emit(WorkflowEventType.TaskDone, {
      sessionId: this.params.sessionId,
      taskId: this.id,
      status: status,
    })
  }

  private handleError(error: TaskExecutionError): void {
    if (error instanceof TaskCancellationError) {
      this.taskDone('cancelled')
      return
    }
    this._error = error.message
    eventBus.emit(ErrorEventType.TaskError, {
      context: {
        taskId: this.id,
        sessionId: this.params.sessionId,
        agentId: this.params.agentId,
        queryId: this.params.queryId,
        round: this.params.round,
      },
      title: error.title,
      message: error.message,
      label: error instanceof ActionableError ? error.label : undefined,
      action: error instanceof ActionableError ? error.action : undefined,
    })
    this.taskDone('failed')
  }

  private async _run(): Promise<void> {
    const agent = await agentsApi.getById(this.params.agentId)
    if (!agent) {
      throw new AgentNotFoundError(this.params)
    }

    const provider = providerService.getProviderById(agent.llm.providerId)
    if (!provider) {
      throw new ProviderNotFoundError(this.params)
    }

    const model = provider.models.find((m) => m.id === agent.llm.modelId) ?? null
    if (!model) {
      throw new ModelNotFoundError(this.params)
    }

    // 检查所有 MCP servers 是否就绪，并收集 tools
    const tools: ExtensionTool[] = []
    for (const server of agent.extension.mcpServers) {
      const serverRuntime = await extensionService.getMCPServer(server.id)
      if (!serverRuntime) {
        throw new ExtensionConfigurationRequiredError(this.params, server.name)
      }

      const serverStatus = extensionService.getExtensionStatus(server.id)
      if (!serverStatus || !serverStatus.isReady) {
        throw new ExtensionConfigurationRequiredError(this.params, server.name)
      }

      tools.push(...serverRuntime.tools)
    }

    // 查找当前 provider+model 对应的 customConfig
    const identifier = `${agent.llm.providerId}:${agent.llm.modelId}`
    const customConfig = agent.llm.customConfigs?.find((c) => c.identifier === identifier)

    await provider.run({
      model: agent.llm.modelId,
      customConfig,
      systemPrompt: agent.prompt.systemPrompt,
      tools,
      messages: this.params.contextMessages,
      context: {
        taskId: this.id,
        sessionId: this.params.sessionId,
        agentId: this.params.agentId,
        queryId: this.params.queryId,
        round: this.params.round,
      },
      signal: this._abortController.signal,
      hooks: {
        onSuccess: () => this.taskDone('succeeded'),
        onError: (error) => this.handleError(toError(error, this.params)),
        onPendingApproval: () => this.taskDone('pending_approval'),
      },
    })
  }

  private async run() {
    try {
      this.taskPending()
      await this._run()
    } catch (error) {
      if (this._cancelled) {
        this.handleError(new TaskCancellationError(this.params))
      } else {
        this.handleError(toError(error, this.params))
      }
    }
  }

  public cancel() {
    this._cancelled = true
    this._abortController.abort()
    this.taskDone('cancelled')
  }

  public static calculateSnapshot(responseMessage: ResponseMessage): TaskSnapshot {
    return {
      agentId: responseMessage.agentId,
      round: responseMessage.round,
      status: responseMessage.status,
    }
  }
}

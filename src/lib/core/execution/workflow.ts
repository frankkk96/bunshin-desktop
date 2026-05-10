import { agentsApi } from '@/lib/tauri/repo/agents'
import { StreamEvent } from '../events/message'
import {
  ToolCallRunEvent,
  ToolCallDoneEvent,
  ToolCallUpdateEvent,
  ToolCallPendingEvent,
} from '../events/tool-call'
import { MessageStore } from '../messages/store'
import { Message } from '../messages/types'
import { Query } from './query'
import { ToolCall } from './tool-call'
import { QueryParams, QuerySnapshot, TaskStatus, WorkflowSnapshot, WorkflowStatus } from './types'
import { TaskErrorEvent } from '../events/error'

export class Workflow {
  private _sessionId: string
  private _messageStore: MessageStore
  private _snapshot: WorkflowSnapshot

  // 临时状态
  private _activeQueries: Query[] = []

  constructor(sessionId: string) {
    this._sessionId = sessionId
    this._messageStore = new MessageStore(sessionId)
    this._snapshot = {
      sessionId: sessionId,
      status: 'idle',
      queries: [],
    }
  }

  public get snapshot(): WorkflowSnapshot {
    return this._snapshot
  }

  public get isReady(): boolean {
    return this._messageStore.isReady
  }

  public get messages(): Message[] {
    return this._messageStore.messages
  }

  public get sessionId(): string {
    return this._sessionId
  }

  public get status(): WorkflowStatus {
    const queryMessages = this._messageStore.queryMessages
    const responseMessages = this._messageStore.responseMessages
    const queries: QuerySnapshot[] = queryMessages.map((queryMessage) => {
      const queryResponses = responseMessages.filter((r) => r.queryId === queryMessage.queryId)
      return Query.calculateSnapshot(queryMessage, queryResponses)
    })

    let status: WorkflowStatus = 'idle'

    if (queries.length === 0) {
      status = 'idle'
    } else if (
      queries.some((q) => q.status === 'running') ||
      queries.some((q) => q.status === 'pending') ||
      this._messageStore.hasPendingMessages
    ) {
      status = 'running'
    } else if (queries.some((q) => q.status === 'cancelled')) {
      status = 'cancelled'
    } else if (queries.some((q) => q.status === 'failed')) {
      status = 'failed'
    } else if (queries.every((q) => q.status === 'succeeded')) {
      status = 'succeeded'
    }
    return status
  }

  public get hasRunningQueries(): boolean {
    return this._messageStore.queryMessages.some((q) => q.status === 'running')
  }

  public updateSnapshot(): void {
    const queryMessages = this._messageStore.queryMessages
    const responseMessages = this._messageStore.responseMessages
    const queries: QuerySnapshot[] = queryMessages.map((queryMessage) => {
      const queryResponses = responseMessages.filter((r) => r.queryId === queryMessage.queryId)
      return Query.calculateSnapshot(queryMessage, queryResponses)
    })

    this._snapshot = {
      sessionId: this.sessionId,
      status: this.status,
      queries: queries,
    }
  }

  public handleStreamEvent(event: StreamEvent): void {
    this._messageStore.handleStreamEvent(event)
  }

  public handleTaskPending(agentId: string, round: number, queryId: number, taskId: string): void {
    this._messageStore.addPendingResponseMessage(queryId, agentId, round, taskId)
  }

  public handleTaskDone(taskId: string, status: TaskStatus): void {
    const queryId = this._messageStore.getResponseMessage(taskId).queryId
    this._messageStore.setResponseMessageStatus(taskId, status)
    if (this.queryFinished(queryId)) {
      this.handleStartNextQuery()
    }
  }

  public handleEditMessage(messageId: string, content: string): void {
    this._messageStore.editMessage(messageId, content)
  }

  public handleEnqueueQueries(queries: QueryParams[]): void {
    for (const q of queries) {
      this._messageStore.enqueueNewQuery(q)
    }
    if (this.hasRunningQueries) {
      return
    }
    this.handleStartNextQuery()
  }

  public handleStartNextQuery(): void {
    const nextQueryMessage = this._messageStore.nextQueryMessage
    if (!nextQueryMessage) return
    this.ensureQuery(nextQueryMessage.queryId).start()
  }

  public handleCancel(): void {
    for (const query of this._activeQueries) {
      query.cancel()
    }
    this._messageStore.cancelPendingQueries()
    this._activeQueries = []
  }

  public handleTaskError(event: TaskErrorEvent): void {
    this._messageStore.addTaskErrorMessage(
      event.context,
      event.title,
      event.message,
      event.label,
      event.action,
    )
  }

  public handleToolCallPending(event: ToolCallPendingEvent): void {
    this._messageStore.addPendingToolCallMessage(
      event.metadata.queryId,
      event.metadata.agentId,
      event.metadata.round,
      event.metadata.taskId,
      event.tc,
    )
    agentsApi.getById(event.metadata.agentId).then((agent) => {
      if (agent?.extension.skipPermission) {
        this.handleToolCallRun(event)
      }
    })
  }

  public handleToolCallRun(event: ToolCallRunEvent): void {
    const toolCall = new ToolCall(event.metadata, event.tc)
    toolCall.run()
  }

  public handleToolCallDone(event: ToolCallDoneEvent): void {
    // 更新当前 round 的 response message 状态为 succeeded
    this._messageStore.setResponseMessageStatus(event.metadata.taskId, 'succeeded')
    const query = this.ensureQuery(event.metadata.queryId)
    query.startNewRound(event.metadata.agentId, event.metadata.round)
  }

  public handleToolCallUpdate(event: ToolCallUpdateEvent): void {
    this._messageStore.updateToolCall(event.metadata.taskId, event.status, event.text)
  }

  // TODO: retry的逻辑要再测试优化
  public handleRetryQuery(queryId: number): void {
    this._messageStore.clearStaledMessagesByQueryId(queryId)
    // 移除旧的 query 实例，这样下次 ensureQuery 会创建新实例
    this._activeQueries = this._activeQueries.filter((q) => q.id !== queryId)

    if (!this.hasRunningQueries) {
      // 没有其他运行中的 query，直接启动，不设为 pending（避免 query 被 syncAndNotify 跳过）
      this.ensureQuery(queryId).start()
    } else {
      // 有其他运行中的 query，设为 pending 等待执行
      this._messageStore.resetQueryToPending(queryId)
    }
  }

  public handleRetryTask(queryId: number, taskId: string): void {
    const query = this.ensureQuery(queryId)
    query.retryTask(taskId)
  }

  private ensureQuery(queryId: number): Query {
    let query = this._activeQueries.find((q) => q.id === queryId)
    if (!query) {
      query = new Query(queryId, this._messageStore)
      this._activeQueries.push(query)
    }
    return query
  }

  private queryFinished(queryId: number): boolean {
    const queryMessage = this._messageStore.getQueryMessage(queryId)
    if (!queryMessage) return false
    return queryMessage.status === 'succeeded'
  }
}

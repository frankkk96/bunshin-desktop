import { messagesApi } from '@/lib/tauri/repo/sessions'
import { handleRuntimeError } from '../utils/error'
import { logger } from '../utils/logger'
import { debounceByKey } from '../utils/debounce'
import {
  Message,
  QueryMessage,
  ResponseMessage,
  DataItem,
  ContentItem,
  ReasoningItem,
  ContextItem,
  ToolCallItem,
  MediaItem,
} from './types'
import { MessageEventType, StreamEvent } from '../events/message'
import { eventBus } from '../events/event-bus'
import { queryMessageId } from '../utils/random'
import { QueryParams, TaskStatus } from '../execution/types'
import { ToolCallParams, ToolCallStatus } from '../extensions/types'
import { ErrorAction } from '../execution/errors/types'
import { TaskContext } from '../providers/base'

/**
 * MessageStore - 管理会话中的消息存储
 *
 * 职责：
 * 1. 管理 QueryMessage 和 ResponseMessage 的内存状态
 * 2. 处理流式事件更新消息内容
 * 3. 同步消息到数据库（debounced）
 * 4. 提供消息查询接口
 */
export class MessageStore {
  // ============ Private Fields ============

  private _isReady = false
  private _sessionId: string
  private _queryMessages: QueryMessage[] = []
  private _responseMessages: ResponseMessage[] = []
  private _messages: Message[] = []

  private readonly debouncedUpsertQuery = debounceByKey(
    (query: QueryMessage) => messagesApi.upsertQuery(query),
    1000,
    (query) => query.id,
  )

  private readonly debouncedUpsertResponse = debounceByKey(
    (message: ResponseMessage) => messagesApi.upsertResponse(message),
    1000,
    (message) => message.id,
  )

  private readonly debouncedDeleteMessage = debounceByKey(
    (messageId: string) => messagesApi.deleteMessage(messageId),
    1000,
    (messageId) => messageId,
  )

  // ============ Constructor ============

  constructor(sessionId: string) {
    this._sessionId = sessionId
    this.restoreFromDb()
  }

  // ============ Public Getters ============

  public get isReady(): boolean {
    return this._isReady
  }

  public get queryMessages(): QueryMessage[] {
    return this._queryMessages
  }

  public get responseMessages(): ResponseMessage[] {
    return this._responseMessages
  }

  public get messages(): Message[] {
    return this._messages
  }

  public get hasPendingMessages(): boolean {
    return this._queryMessages.some((msg) => msg.status === 'pending')
  }

  public get nextQueryMessage(): QueryMessage | null {
    return (
      this._queryMessages
        .filter((msg) => msg.status === 'pending')
        .sort((a, b) => a.queryId - b.queryId)[0] ?? null
    )
  }

  // ============ Public Methods: Query Operations ============

  public enqueueNewQuery(queryParams: QueryParams): void {
    if (!this._isReady) return

    const queryMessage: QueryMessage = {
      type: 'query',
      id: queryMessageId(),
      queryId: this._queryMessages.length,
      timestamp: Date.now(),
      sessionId: this._sessionId,
      agents: queryParams.agents,
      text: queryParams.text,
      medias: queryParams.medias,
      status: 'pending',
    }

    this._queryMessages.push(queryMessage)
    this.syncAndNotify()
    this.debouncedUpsertQuery(queryMessage)
  }

  public cancelPendingQueries(): void {
    if (!this._isReady) return

    for (const queryMessage of this._queryMessages) {
      if (queryMessage.status === 'pending') {
        this.updateQueryMessage(queryMessage.queryId, { status: 'cancelled' })
      }
    }
  }

  public resetQueryToPending(queryId: number): void {
    if (!this._isReady) return
    this.updateQueryMessage(queryId, { status: 'pending' })
  }

  public getQueryMessage(queryId: number): QueryMessage {
    this.ensureReady()
    const queryMessage = this._queryMessages.find((msg) => msg.queryId === queryId)
    if (!queryMessage) {
      throw new Error(`Query message not found for queryId: ${queryId}`)
    }
    return queryMessage
  }

  // ============ Public Methods: Response Operations ============

  public addPendingResponseMessage(
    queryId: number,
    agentId: string,
    round: number,
    taskId: string,
  ): void {
    if (!this._isReady) return

    this.upsertResponseMessage(taskId, {
      sessionId: this._sessionId,
      agentId,
      queryId,
      round,
      type: 'response',
      status: 'pending',
    })
    this.recalculateQueryStatus(queryId)
  }

  public setResponseMessageStatus(messageId: string, status: TaskStatus): void {
    if (!this._isReady) return

    this.upsertResponseMessage(messageId, { status })
    const queryId = this.getResponseMessage(messageId).queryId
    this.recalculateQueryStatus(queryId)
  }

  public getResponseMessage(taskId: string): ResponseMessage {
    this.ensureReady()
    const responseMessage = this._responseMessages.find((msg) => msg.id === taskId)
    if (!responseMessage) {
      throw new Error(`Response message not found for taskId: ${taskId}`)
    }
    return responseMessage
  }

  public editMessage(messageId: string, content: string): void {
    if (!this._isReady) return

    const existingMessage = this._responseMessages.find((msg) => msg.id === messageId)
    this.upsertResponseMessage(messageId, {
      status: existingMessage?.status ?? 'succeeded',
      data: [{ type: 'content', content } as ContentItem],
    })
  }

  // ============ Public Methods: Tool Call Operations ============

  public addPendingToolCallMessage(
    queryId: number,
    agentId: string,
    round: number,
    taskId: string,
    tc: ToolCallParams,
  ): void {
    if (!this._isReady) return

    const toolCallItem: ToolCallItem = {
      type: 'tool_call',
      tc,
      status: 'pending_approval',
      text: `Calling ${tc.function.name}: ${tc.function.arguments}`,
    }

    const updatedData = this.upsertDataItem(
      taskId,
      toolCallItem,
      (item) => item.type === 'tool_call' && item.tc.id === tc.id,
    )

    this.upsertResponseMessage(taskId, {
      sessionId: this._sessionId,
      agentId,
      queryId,
      round,
      type: 'response',
      status: 'pending_approval',
      data: updatedData,
    })
  }

  public updateToolCall(messageId: string, status: ToolCallStatus, text: string): void {
    if (!this._isReady) return

    const message = this.getResponseMessage(messageId)
    const data: DataItem[] = message.data.map((item) =>
      item.type === 'tool_call' ? { ...item, status, text } : item,
    )
    this.upsertResponseMessage(messageId, { data })
  }

  // ============ Public Methods: Error Handling ============

  public addTaskErrorMessage(
    context: TaskContext,
    title: string,
    message: string,
    label?: string,
    action?: ErrorAction,
  ): void {
    if (!this._isReady) return

    this.upsertResponseMessage(context.taskId, {
      sessionId: context.sessionId,
      agentId: context.agentId,
      queryId: context.queryId,
      round: context.round,
      type: 'response',
      status: 'failed',
      error: { type: 'error', title, message, label, action },
    } as Partial<ResponseMessage>)
  }

  // ============ Public Methods: Stream Event Handling ============

  public handleStreamEvent(event: StreamEvent): void {
    if (!this._isReady) return

    try {
      const { chunk } = event
      const handlers: Record<string, (e: StreamEvent) => void> = {
        'content.delta': (e) => this.handleDeltaEvent(e, 'content'),
        'reasoning.delta': (e) => this.handleDeltaEvent(e, 'reasoning'),
        content: (e) => this.handleFullEvent(e, 'content'),
        reasoning: (e) => this.handleFullEvent(e, 'reasoning'),
        context: (e) => this.handleFullEvent(e, 'context'),
        media: this.handleMediaEvent.bind(this),
      }

      const handler = handlers[chunk.data.type]
      if (handler) {
        handler(event)
      } else {
        logger.warn('Unknown stream event type', {
          sessionId: event.sessionId,
          agentId: event.agentId,
          messageId: chunk.messageId,
          type: chunk.data.type,
        })
      }
    } catch (error) {
      handleRuntimeError(error, {
        message: 'Stream event processing failed: ' + JSON.stringify(event),
      })
    } finally {
      this.recalculateQueryStatus(event.queryId)
    }
  }

  // ============ Public Methods: Context Queries ============

  public getContextMessagesForQuery(queryId: number): Message[] {
    if (!this._isReady) return []

    const messages: Message[] = []

    // 包含之前的所有 query 和 response
    for (const queryMessage of this._queryMessages) {
      if (queryMessage.queryId < queryId) {
        messages.push(queryMessage)
        messages.push(...this._responseMessages.filter((r) => r.queryId === queryMessage.queryId))
      }
    }

    // 包含当前 query
    const currentQuery = this._queryMessages.find((msg) => msg.queryId === queryId)
    if (!currentQuery) {
      throw new Error(`Query message not found for queryId: ${queryId}`)
    }
    messages.push(currentQuery)

    return messages
  }

  public getContextMessagesForAgentRound(
    queryId: number,
    agentId: string,
    round: number,
  ): Message[] {
    if (!this._isReady) return []

    return this._responseMessages.filter(
      (msg) => msg.queryId === queryId && msg.agentId === agentId && msg.round < round,
    )
  }

  public getMessageById(messageId: string): Message {
    this.ensureReady()
    const message = this._messages.find((msg) => msg.id === messageId)
    if (!message) {
      throw new Error(`Message not found: ${messageId}`)
    }
    return message
  }

  // ============ Public Methods: Cleanup Operations ============

  public clearStaledMessagesByQueryId(queryId: number): void {
    if (!this._isReady) return

    const staleMessages = this.getStaleMessagesByQueryId(queryId)
    for (const message of staleMessages) {
      this.deleteMessage(message.id)
    }
    this.syncAndNotify()
  }

  public clearStaledMessagesByTaskId(taskId: string): void {
    if (!this._isReady) return

    const staleMessages = this.getStaleMessagesByTaskId(taskId)
    for (const message of staleMessages) {
      this.deleteMessage(message.id)
    }
    this.syncAndNotify()
  }

  public destroy(): void {
    this.debouncedUpsertQuery.flush()
    this.debouncedUpsertResponse.flush()
  }

  // ============ Private Methods: Initialization ============

  private async restoreFromDb(): Promise<void> {
    const [queryMessages, responseMessages] = await Promise.all([
      messagesApi.getQueriesBySession(this._sessionId),
      messagesApi.getResponsesBySession(this._sessionId),
    ])

    this._queryMessages = queryMessages
    this._responseMessages = responseMessages
    this._isReady = true

    this.syncAndNotify()
    eventBus.emit(MessageEventType.RestoredMessage, { sessionId: this._sessionId })
  }

  private ensureReady(): void {
    if (!this._isReady) {
      throw new Error('Message store not ready')
    }
  }

  // ============ Private Methods: Query Message Operations ============

  private updateQueryMessage(queryId: number, updates: Partial<QueryMessage>): void {
    const index = this._queryMessages.findIndex((msg) => msg.queryId === queryId)
    if (index === -1) {
      throw new Error(`Query message not found for queryId: ${queryId}`)
    }

    const updated: QueryMessage = { ...this._queryMessages[index], ...updates }
    this._queryMessages[index] = updated

    this.syncAndNotify()
    this.debouncedUpsertQuery(updated)
  }

  private recalculateQueryStatus(queryId: number): void {
    if (!this._isReady) return

    const responses = this._responseMessages.filter((msg) => msg.queryId === queryId)

    // 优先级：running > cancelled > failed > succeeded
    const hasRunning = responses.some(
      (msg) =>
        msg.status === 'running' || msg.status === 'pending_approval' || msg.status === 'pending',
    )
    if (hasRunning) {
      this.updateQueryMessage(queryId, { status: 'running' })
      return
    }

    const hasCancelled = responses.some((msg) => msg.status === 'cancelled')
    if (hasCancelled) {
      this.updateQueryMessage(queryId, { status: 'cancelled' })
      return
    }

    const hasFailed = responses.some((msg) => msg.status === 'failed')
    if (hasFailed) {
      this.updateQueryMessage(queryId, { status: 'failed' })
      return
    }

    this.updateQueryMessage(queryId, { status: 'succeeded' })
  }

  // ============ Private Methods: Response Message Operations ============

  private upsertResponseMessage(messageId: string, updates: Partial<ResponseMessage>): void {
    const existingIndex = this._responseMessages.findIndex((msg) => msg.id === messageId)
    const existing = existingIndex >= 0 ? this._responseMessages[existingIndex] : undefined

    const updated: ResponseMessage = existing
      ? { ...existing, ...updates }
      : ({
          id: messageId,
          timestamp: Date.now(),
          status: 'running',
          data: [],
          ...updates,
        } as ResponseMessage)

    if (existingIndex >= 0) {
      this._responseMessages[existingIndex] = updated
    } else {
      // 按时间顺序插入
      const insertIndex = this._responseMessages.findIndex(
        (msg) => (msg.timestamp || 0) > (updated.timestamp || 0),
      )
      if (insertIndex >= 0) {
        this._responseMessages.splice(insertIndex, 0, updated)
      } else {
        this._responseMessages.push(updated)
      }
    }

    this.syncAndNotify()
    this.debouncedUpsertResponse(updated)
  }

  private deleteMessage(messageId: string): void {
    this._queryMessages = this._queryMessages.filter((msg) => msg.id !== messageId)
    this._responseMessages = this._responseMessages.filter((msg) => msg.id !== messageId)
    this.debouncedDeleteMessage(messageId)
  }

  // ============ Private Methods: DataItem Operations ============

  private getExistingData(messageId: string): DataItem[] {
    return this._responseMessages.find((msg) => msg.id === messageId)?.data ?? []
  }

  private upsertDataItem(
    messageId: string,
    newItem: DataItem,
    matcher: (item: DataItem) => boolean,
  ): DataItem[] {
    const existingData = this.getExistingData(messageId)
    const existingIndex = existingData.findIndex(matcher)

    if (existingIndex >= 0) {
      return [
        ...existingData.slice(0, existingIndex),
        newItem,
        ...existingData.slice(existingIndex + 1),
      ]
    }
    return [...existingData, newItem]
  }

  private appendOrUpdateDataItem(
    messageId: string,
    itemType: 'content' | 'reasoning' | 'context',
    value: string,
    append: boolean,
  ): DataItem[] {
    const existingData = this.getExistingData(messageId)
    const existingIndex = existingData.findIndex((item) => item.type === itemType)

    const createItem = (val: string): DataItem => {
      switch (itemType) {
        case 'content':
          return { type: 'content', content: val } as ContentItem
        case 'reasoning':
          return { type: 'reasoning', reasoning: val } as ReasoningItem
        case 'context':
          return { type: 'context', context: val } as ContextItem
      }
    }

    if (existingIndex >= 0) {
      const existing = existingData[existingIndex]
      const currentValue =
        itemType === 'content'
          ? (existing as ContentItem).content
          : itemType === 'reasoning'
          ? (existing as ReasoningItem).reasoning
          : (existing as ContextItem).context

      const newValue = append ? currentValue + value : value
      return [
        ...existingData.slice(0, existingIndex),
        createItem(newValue),
        ...existingData.slice(existingIndex + 1),
      ]
    }

    // 新增项：reasoning 放最前面，context 放 reasoning 后面，其他放最后
    const newItem = createItem(value)
    if (itemType === 'reasoning') {
      return [newItem, ...existingData]
    }
    if (itemType === 'context') {
      const reasoningIndex = existingData.findIndex((item) => item.type === 'reasoning')
      const insertIndex = reasoningIndex >= 0 ? reasoningIndex + 1 : 0
      return [...existingData.slice(0, insertIndex), newItem, ...existingData.slice(insertIndex)]
    }
    return [...existingData, newItem]
  }

  // ============ Private Methods: Stream Event Handlers ============

  private handleDeltaEvent(event: StreamEvent, itemType: 'content' | 'reasoning'): void {
    const { sessionId, agentId, queryId, round, chunk } = event
    const { messageId, data } = chunk

    const delta =
      data.type === 'content.delta'
        ? data.delta || ''
        : data.type === 'reasoning.delta'
        ? data.delta || ''
        : ''

    const updatedData = this.appendOrUpdateDataItem(messageId, itemType, delta, true)

    this.upsertResponseMessage(messageId, {
      sessionId,
      agentId,
      queryId,
      round,
      type: 'response',
      status: 'running',
      data: updatedData,
    })
  }

  private handleFullEvent(event: StreamEvent, itemType: 'content' | 'reasoning' | 'context'): void {
    const { sessionId, agentId, queryId, round, chunk } = event
    const { messageId, data } = chunk

    const text =
      data.type === 'content'
        ? data.text
        : data.type === 'reasoning'
        ? data.text
        : data.type === 'context'
        ? data.text
        : ''

    const updatedData = this.appendOrUpdateDataItem(messageId, itemType, text, false)

    this.upsertResponseMessage(messageId, {
      sessionId,
      agentId,
      queryId,
      round,
      type: 'response',
      status: 'running',
      data: updatedData,
    })
  }

  private handleMediaEvent(event: StreamEvent): void {
    const { sessionId, agentId, queryId, round, chunk } = event
    const { messageId, data } = chunk

    if (data.type !== 'media') return

    const existingData = this.getExistingData(messageId)
    const mediaItem: MediaItem = { type: 'media', media: data.media }

    this.upsertResponseMessage(messageId, {
      sessionId,
      agentId,
      queryId,
      round,
      type: 'response',
      status: 'running',
      data: [...existingData, mediaItem],
    })
  }

  // ============ Private Methods: Stale Message Detection ============

  private getStaleMessagesByQueryId(queryId: number): Message[] {
    const messages: Message[] = []

    for (const message of this._messages) {
      // 后续 query 的所有消息
      if (message.queryId > queryId) {
        messages.push(message)
        continue
      }
      // 当前 query 的 response 消息
      if (message.queryId === queryId && message.type === 'response') {
        messages.push(message)
      }
    }

    return messages
  }

  private getStaleMessagesByTaskId(taskId: string): Message[] {
    const targetMessage = this.getMessageById(taskId)
    const messages: Message[] = []

    if (targetMessage.type === 'query') {
      // 删除当前及后续 query 的所有消息（除了当前 query message 本身）
      for (const message of this._messages) {
        if (message.id !== taskId && message.queryId >= targetMessage.queryId) {
          messages.push(message)
        }
      }
    } else {
      // 删除后续 query 的所有消息
      // 以及同一 query、同一 agent 的当前及后续 round 消息
      for (const message of this._messages) {
        if (message.queryId > targetMessage.queryId) {
          messages.push(message)
        } else if (
          message.type === 'response' &&
          message.queryId === targetMessage.queryId &&
          message.agentId === targetMessage.agentId &&
          message.round >= targetMessage.round
        ) {
          messages.push(message)
        }
      }
    }

    return messages
  }

  // ============ Private Methods: Cache Sync ============

  private syncAndNotify(): void {
    if (!this._isReady) return

    const messages: Message[] = []

    for (const queryMessage of this._queryMessages) {
      const responses = this._responseMessages.filter((r) => r.queryId === queryMessage.queryId)

      // 跳过 pending 状态的 query，以及没有 response 的 cancelled query
      if (
        queryMessage.status === 'pending' ||
        (queryMessage.status === 'cancelled' && responses.length === 0)
      ) {
        continue
      }

      messages.push(queryMessage)
      messages.push(...responses)
    }

    this._messages = messages
  }
}

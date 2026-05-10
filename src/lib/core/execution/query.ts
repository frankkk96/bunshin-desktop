import { Task } from './task'
import { Message, QueryMessage, ResponseMessage } from '../messages/types'
import { QuerySnapshot, QueryStatus, TaskParams, TaskSnapshot, TaskStatus } from './types'
import { MessageStore } from '../messages/store'

export class Query {
  private _id: number
  private _activeTasks: Task[] = []
  private _started: boolean = false
  private _messageStore: MessageStore
  private _queryContextMessages: Message[] = []

  constructor(queryId: number, messageStore: MessageStore) {
    this._messageStore = messageStore
    this._id = queryId
    this._queryContextMessages = messageStore.getContextMessagesForQuery(queryId)
  }

  public get id(): number {
    return this._id
  }

  public get queryMessage(): QueryMessage {
    return this._messageStore.getQueryMessage(this._id)
  }

  public get status(): QueryStatus {
    return this._messageStore.getQueryMessage(this._id).status
  }

  public get activeTasks(): Task[] {
    return this._activeTasks
  }

  public start(): void {
    if (this._started) return
    this._started = true

    for (const agentId of this.queryMessage.agents) {
      this.addTask({
        sessionId: this.queryMessage.sessionId,
        queryId: this._id,
        agentId: agentId,
        round: 0,
        contextMessages: this._queryContextMessages,
      })
    }
  }

  public cancel(): void {
    if (this.status !== 'running') return
    for (const task of this._activeTasks) {
      if (
        this.getTaskStatus(task.id) === 'running' ||
        this.getTaskStatus(task.id) === 'pending_approval' ||
        this.getTaskStatus(task.id) === 'pending'
      ) {
        task.cancel()
      }
    }
    this._activeTasks = []
  }

  public startNewRound(agentId: string, currentRound: number): void {
    const newRound = currentRound + 1
    const updatedContextMessages = [...this._queryContextMessages]
    const newMessages = this._messageStore.getContextMessagesForAgentRound(
      this._id,
      agentId,
      newRound,
    )

    updatedContextMessages.push(...newMessages)

    this.addTask({
      sessionId: this.queryMessage.sessionId,
      queryId: this._id,
      agentId: agentId,
      round: newRound,
      contextMessages: updatedContextMessages,
    })
  }

  public retryTask(taskId: string): void {
    const responseMessage = this._messageStore.getMessageById(taskId)
    if (responseMessage.type !== 'response') {
      throw new Error('Message is not a response')
    }
    const updatedContextMessages = [...this._queryContextMessages]
    const newMessages = this._messageStore.getContextMessagesForAgentRound(
      this._id,
      responseMessage.agentId,
      responseMessage.round,
    )

    updatedContextMessages.push(...newMessages)
    this._messageStore.clearStaledMessagesByTaskId(taskId)

    this.addTask({
      id: responseMessage.id,
      sessionId: responseMessage.sessionId,
      queryId: responseMessage.queryId,
      agentId: responseMessage.agentId,
      round: responseMessage.round,
      contextMessages: updatedContextMessages,
    })
  }

  public static calculateSnapshot(
    queryMessage: QueryMessage,
    queryResponses: ResponseMessage[],
  ): QuerySnapshot {
    const tasks: TaskSnapshot[] = queryResponses.map((r) => Task.calculateSnapshot(r))
    return {
      queryId: queryMessage.queryId,
      message: queryMessage,
      status: queryMessage.status,
      tasks,
    }
  }

  private getTaskStatus(taskId: string): TaskStatus {
    return this._messageStore.getResponseMessage(taskId).status
  }

  private addTask(params: TaskParams): Task {
    const task = new Task(params)
    this._activeTasks.push(task)
    return task
  }
}

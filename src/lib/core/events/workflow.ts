import { QueryParams, TaskStatus } from '../execution/types'

export enum WorkflowEventType {
  TaskPending = 'workflow:task_pending',
  TaskDone = 'workflow:task_done',
  EnqueueQueries = 'workflow:enqueue_queries',
  CancelWorkflow = 'workflow:cancel',
  RetryTask = 'workflow:retry_task',
  RetryQuery = 'workflow:retry_query',
}

export interface TaskPendingEvent {
  sessionId: string
  agentId: string
  round: number
  queryId: number
  taskId: string
}

export interface TaskDoneEvent {
  sessionId: string
  taskId: string
  status: TaskStatus
}

export interface EnqueueQueriesEvent {
  sessionId: string
  queryParams: QueryParams[]
}

export interface CancelWorkflowEvent {
  sessionId: string
}

export interface RetryTaskEvent {
  sessionId: string
  queryId: number
  taskId: string
}

export interface RetryQueryEvent {
  sessionId: string
  queryId: number
}

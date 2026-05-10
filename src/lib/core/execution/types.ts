import { MediaItem, Message, QueryMessage } from '../messages/types'

export type TaskStatus =
  | 'pending'
  | 'pending_approval'
  | 'running'
  | 'cancelled'
  | 'failed'
  | 'succeeded'
export type WorkflowStatus = 'idle' | 'running' | 'cancelled' | 'failed' | 'succeeded'
export type QueryStatus = 'pending' | 'running' | 'cancelled' | 'failed' | 'succeeded'

export interface TaskParams {
  id?: string
  sessionId: string
  queryId: number
  agentId: string
  round: number
  contextMessages: Message[]
}

export interface QueryParams {
  sessionId: string
  agents: string[]
  text: string
  medias: MediaItem[]
}

export interface WorkflowSnapshot {
  sessionId: string
  status: WorkflowStatus
  queries: QuerySnapshot[]
}

export interface QuerySnapshot {
  queryId: number
  message: QueryMessage
  status: QueryStatus
  tasks: TaskSnapshot[]
}

export interface TaskSnapshot {
  agentId: string
  round: number
  status: TaskStatus
}

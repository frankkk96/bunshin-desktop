/**
 * Session and Message Type Definitions
 * Client-side types for session management and messaging
 */

// Import item types from worker schema
import { ErrorAction } from '@/lib/core/execution/errors/types'
import { ToolCallParams } from '@/lib/core/extensions/types'
import { QueryStatus, TaskStatus } from '../execution/types'
import { Media } from '@/lib/tauri/service/media'

export type ContentItem = {
  type: 'content'
  content: string
}

export type ReasoningItem = {
  type: 'reasoning'
  reasoning: string
}

export type ContextItem = {
  type: 'context'
  context: string
}

export type ToolCallItem = {
  type: 'tool_call'
  tc: ToolCallParams
  status: 'executing' | 'pending_approval' | 'rejected' | 'completed' | 'failed'
  text: string
}

export type ErrorItem = {
  type: 'error'
  title: string
  message: string
  label?: string
  action?: ErrorAction
}

export type MediaItem = {
  type: 'media'
  media: Media
}

export type DataItem = ToolCallItem | ContentItem | ReasoningItem | ContextItem | MediaItem

export interface BaseMessage {
  id: string // uuid
  sessionId: string
  queryId: number
  timestamp: number
  metadata?: Record<string, unknown>
}

// Response (Agent 的响应)
export interface ResponseMessage extends BaseMessage {
  type: 'response'
  agentId: string
  round: number
  status: TaskStatus
  data: DataItem[]
  error?: ErrorItem // TODO: media相关的要把metadata打进去
}

// Query (用户的查询)
export interface QueryMessage extends BaseMessage {
  type: 'query'
  agents: string[]
  text: string
  medias: MediaItem[]
  status: QueryStatus
}

export type Message = QueryMessage | ResponseMessage

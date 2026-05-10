import { Media } from '@/lib/tauri/service/media'

export type ContentChunk = {
  type: 'content'
  text: string
}

export type ContentDeltaChunk = {
  type: 'content.delta'
  delta: string
}

export type ReasoningChunk = {
  type: 'reasoning'
  text: string
}

export type ReasoningDeltaChunk = {
  type: 'reasoning.delta'
  delta: string
}

export type ContextChunk = {
  type: 'context'
  text: string
}

export type MediaChunk = {
  type: 'media'
  media: Media
}

export type Chunk =
  | ContentChunk
  | ContentDeltaChunk
  | ReasoningChunk
  | ReasoningDeltaChunk
  | ContextChunk
  | MediaChunk

export type EventChunk = {
  messageId: string
  timestamp: number
  data: Chunk
}

export enum MessageEventType {
  StreamEvent = 'messages:stream_event',
  EditMessage = 'messages:edit_message',
  RestoredMessage = 'messages:restored_message',
}

export interface StreamEvent {
  sessionId: string
  agentId: string
  queryId: number
  round: number
  created: number
  chunk: EventChunk
}

export interface EditMessageEvent {
  sessionId: string
  messageId: string
  content: string
}

export interface RestoredMessageEvent {
  sessionId: string
}

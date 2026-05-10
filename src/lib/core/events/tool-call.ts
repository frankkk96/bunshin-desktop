import { ToolCallParams, ToolCallMetadata, ToolCallStatus } from '../extensions/types'

export interface ToolCallPendingEvent {
  metadata: ToolCallMetadata
  tc: ToolCallParams
}

export interface ToolCallRunEvent {
  metadata: ToolCallMetadata
  tc: ToolCallParams
}

export interface ToolCallDoneEvent {
  metadata: ToolCallMetadata
}

export interface ToolCallUpdateEvent {
  metadata: ToolCallMetadata
  status: ToolCallStatus
  text: string
}

export enum ToolCallEventType {
  ToolCallPending = 'toolcall:pending',
  ToolCallRun = 'toolcall:run',
  ToolCallDone = 'toolcall:done',
  ToolCallUpdate = 'toolcall:update',
}

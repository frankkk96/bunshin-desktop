export type ProviderType = 'subscription' | 'api'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string | null
  createdAt: number
  updatedAt: number
}

export interface Agent {
  id: string
  alias: string
  description: string | null
  avatar: string | null
  providerId: string
  createdAt: number
  updatedAt: number
}

export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'bypassPermissions'
  | 'dontAsk'

export interface Session {
  id: string
  agentId: string
  name: string | null
  cwd: string
  permissionMode: PermissionMode
  favorite: boolean
  createdAt: number
  updatedAt: number
  visitedAt: number
  claudeSessionId: string
}

/**
 * One row in the messages table = one stream-json event from the claude
 * subprocess (or a `local_user` mirror of an outgoing user message).
 */
export interface Message {
  id: string
  sessionId: string
  seq: number
  kind: string
  payload: any
  timestamp: number
}

export interface RunningSessionInfo {
  sessionId: string
  status: 'running' | 'stopped' | 'crashed'
}

export interface MediaAttachment {
  localPath: string
  name: string
  mediaType: 'image' | 'pdf' | 'video' | 'audio' | 'document'
  mimeType: string
}

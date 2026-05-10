import { invoke } from '@tauri-apps/api/core'
import type { QueryMessage, ResponseMessage } from '@/lib/core/messages/types'

export type MessageSearchResult = {
  message: QueryMessage | ResponseMessage
  session: SessionMetadata | null
}

export type SessionMetadata = {
  id: string
  contactId: string
  visitedAt: number
  createdAt: number
  updatedAt: number
  messageCount: number
  firstMessage?: string
  lastMessage?: string
  lastMessageTimestamp?: number
  favorite?: boolean
}

/**
 * Session management
 */
export const sessionApi = {
  /**
   * Get all sessions
   */
  getAll: async (): Promise<SessionMetadata[]> => {
    return invoke<SessionMetadata[]>('get_all_sessions')
  },

  /**
   * Get session by ID
   */
  getById: async (sessionId: string): Promise<SessionMetadata | null> => {
    return invoke<SessionMetadata | null>('get_session_by_id', { sessionId })
  },

  /**
   * Create a new session
   */
  create: async (sessionId: string, contactId: string): Promise<void> => {
    return invoke<void>('create_session', { sessionId, contactId })
  },

  /**
   * Update session favorite status
   */
  updateFavorite: async (sessionId: string, favorite: boolean): Promise<void> => {
    return invoke<void>('update_session_favorite', { sessionId, favorite })
  },

  /**
   * Update session visited time
   */
  updateVisited: async (sessionId: string): Promise<void> => {
    return invoke<void>('update_session_visited', { sessionId })
  },
}

/**
 * Query management (用户查询)
 */
export const messagesApi = {
  /**
   * Upsert a query
   */
  upsertQuery: async (query: QueryMessage): Promise<void> => {
    return invoke<void>('upsert_query', { query })
  },

  /**
   * Get queries by session
   */
  getQueriesBySession: async (sessionId: string): Promise<QueryMessage[]> => {
    return invoke<QueryMessage[]>('get_queries_by_session', { sessionId })
  },

  /**
   * Get query by ID
   */
  getQueryById: async (id: string): Promise<QueryMessage | null> => {
    return invoke<QueryMessage | null>('get_query_by_id', { id })
  },

  /**
   * Delete query
   */
  deleteQuery: async (id: string): Promise<void> => {
    return invoke<void>('delete_query', { id })
  },

  /**
   * Delete message
   */
  deleteMessage: async (id: string): Promise<void> => {
    return invoke<void>('delete_message', { id })
  },

  /**
   * Upsert a response
   */
  upsertResponse: async (response: ResponseMessage): Promise<void> => {
    return invoke<void>('upsert_response', { response })
  },

  /**
   * Get responses by session
   */
  getResponsesBySession: async (sessionId: string): Promise<ResponseMessage[]> => {
    return invoke<ResponseMessage[]>('get_responses_by_session', { sessionId })
  },

  /**
   * Get responses by query
   */
  getResponsesByQuery: async (sessionId: string, queryId: number): Promise<ResponseMessage[]> => {
    return invoke<ResponseMessage[]>('get_responses_by_query', { sessionId, queryId })
  },

  /**
   * Get response by ID
   */
  getResponseById: async (id: string): Promise<ResponseMessage | null> => {
    return invoke<ResponseMessage | null>('get_response_by_id', { id })
  },

  /**
   * Delete response
   */
  deleteResponse: async (id: string): Promise<void> => {
    return invoke<void>('delete_response', { id })
  },

  /**
   * Delete all messages in a session
   */
  deleteMessages: async (sessionId: string): Promise<void> => {
    return invoke<void>('delete_messages_by_session_id', { sessionId })
  },

  /**
   * Delete all messages in all sessions
   */
  deleteAllMessages: async (): Promise<void> => {
    return invoke<void>('delete_all_messages')
  },

  /**
   * Search messages
   */
  searchMessages: async (
    query: string,
    contactId?: string,
  ): Promise<MessageSearchResult[]> => {
    return invoke<MessageSearchResult[]>('search_messages', { query, contactId })
  },
}

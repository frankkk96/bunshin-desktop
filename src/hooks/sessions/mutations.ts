import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from './query'
import type { Message } from '@/lib/core/messages/types'
import { messagesApi, sessionApi, type SessionMetadata } from '@/lib/tauri/repo/sessions'
import { useCallback } from 'react'
import { handleDatabaseError } from '@/lib/core/utils/error'
import { logger } from '@/lib/core/utils/logger'

// 纯粹的 mutations - 只负责数据操作，不包含业务逻辑
export function useSessionMutations() {
  const queryClient = useQueryClient()

  // ========== Session Mutations ==========

  const createSessionMutation = useMutation({
    mutationFn: async ({ sessionId, contactId }: { sessionId: string; contactId: string }) => {
      await createSession({ sessionId, contactId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to create session' })
    },
  })

  // 删除会话
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await messagesApi.deleteMessages(sessionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to delete session' })
    },
  })

  // 清空所有会话
  const clearAllSessionsMutation = useMutation({
    mutationFn: async () => {
      await messagesApi.deleteAllMessages()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to clear all sessions' })
    },
  })

  // 更新会话收藏状态
  const updateSessionFavoriteMutation = useMutation({
    mutationFn: async ({ sessionId, favorite }: { sessionId: string; favorite: boolean }) => {
      await sessionApi.updateFavorite(sessionId, favorite)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to update session favorite' })
    },
  })

  // 更新最近访问时间
  const updateSessionVisitedMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!sessionId) return
      await sessionApi.updateVisited(sessionId)
    },
    onSuccess: (_, sessionId) => {
      if (!sessionId) return
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.byId(sessionId) })
    },
    onError: (error) => {
      logger.error('update_session_visited failed', { error })
      handleDatabaseError(error, { message: 'Failed to update session visited time', silent: true })
    },
    retry: 0,
  })

  // ========== Message Mutations ==========

  // 同步消息到数据库
  const syncMessagesMutation = useMutation({
    mutationFn: async ({
      sessionId,
      messages: messagesToSync,
    }: {
      sessionId: string
      messages: Message[]
    }) => {
      if (messagesToSync.length === 0) return
      // 分别upsert queries 和 responses
      for (const msg of messagesToSync) {
        if (msg.type === 'query') {
          await messagesApi.upsertQuery(msg)
        } else if (msg.type === 'response') {
          await messagesApi.upsertResponse(msg)
        }
      }
      logger.info('Synced overlay messages for session:', sessionId)
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.byId(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
    onError: (error) => {
      handleDatabaseError(error, { message: 'Failed to sync overlay messages' })
    },
  })

  const createSession = useCallback(
    async ({ sessionId, contactId }: { sessionId: string; contactId: string }) => {
      const now = Date.now()

      // Only create session record, no initial message
      await sessionApi.create(sessionId, contactId)

      return {
        id: sessionId,
        contactId: contactId,
        createdAt: now,
        updatedAt: now,
        visitedAt: now,
        messageCount: 0,
        lastMessageTimestamp: now,
      } as SessionMetadata
    },
    [],
  )

  return {
    // Session mutations
    createSession: createSessionMutation,
    deleteSession: deleteSessionMutation,
    clearAllSessions: clearAllSessionsMutation,
    updateSessionFavorite: updateSessionFavoriteMutation,
    updateSessionVisited: updateSessionVisitedMutation,

    // Message mutations
    syncMessages: syncMessagesMutation,

    // Direct access to queryClient for custom operations
    queryClient,
  }
}

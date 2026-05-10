import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { Message } from '@/lib/core/messages/types'
import { sessionApi, messagesApi, MessageSearchResult } from '@/lib/tauri/repo/sessions'
import { workflowService } from '@/lib/core/execution/workflow-service'
import { WorkflowSnapshot } from '@/lib/core/execution/types'

export const sessionKeys = {
  all: ['sessions'] as const,
  byId: (sessionId: string) => [...sessionKeys.all, 'byId', sessionId] as const,
  messages: (sessionId: string) => [...sessionKeys.all, sessionId, 'messages'] as const,
}

export function useAllSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: () => sessionApi.getAll(),
  })
}

export function useSessionById(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.byId(sessionId),
    queryFn: async () => {
      const result = await sessionApi.getById(sessionId)
      return result || undefined
    },
    enabled: !!sessionId,
    placeholderData: keepPreviousData,
  })
}

export function useMessages(sessionId: string) {
  const messages = useSyncExternalStore<Message[]>(
    (callback) => {
      return workflowService.subscribe((sid) => {
        if (sid === sessionId) {
          callback()
        }
      })
    },
    (): Message[] => workflowService.getMessages(sessionId),
  )
  return {
    messages,
  }
}

export function useMessageSearch(
  query: string,
  options: { enabled?: boolean; contactId?: string } = {},
) {
  const { enabled = true, contactId } = options

  return useQuery<MessageSearchResult[]>({
    queryKey: [...sessionKeys.all, 'search', query, contactId],
    queryFn: async () => {
      return messagesApi.searchMessages(query, contactId)
    },
    enabled: enabled && query.trim().length > 0,
  })
}

export function useWorkflowById(sessionId: string): WorkflowSnapshot | null {
  return useSyncExternalStore(
    (callback) => {
      return workflowService.subscribe((sid) => {
        if (sid === sessionId) {
          callback()
        }
      })
    },
    () => workflowService.getSnapshot(sessionId),
  )
}

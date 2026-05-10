import { useCallback } from 'react'
import { eventBus } from '@/lib/core/events/event-bus'
import { WorkflowEventType } from '@/lib/core/events/workflow'
import type { QueryParams } from '@/lib/core/execution/types'

export function useSessionActions(sessionId: string | undefined) {
  const send = useCallback(
    (queryParams: QueryParams[]) => {
      if (!sessionId || queryParams.length === 0) return
      eventBus.emit(WorkflowEventType.EnqueueQueries, { sessionId, queryParams })
    },
    [sessionId],
  )

  const cancel = useCallback(() => {
    if (!sessionId) return
    eventBus.emit(WorkflowEventType.CancelWorkflow, { sessionId })
  }, [sessionId])

  const retryTask = useCallback(
    (queryId: number, taskId: string) => {
      if (!sessionId) return
      eventBus.emit(WorkflowEventType.RetryTask, { sessionId, queryId, taskId })
    },
    [sessionId],
  )

  const retryQuery = useCallback(
    (queryId: number) => {
      if (!sessionId) return
      eventBus.emit(WorkflowEventType.RetryQuery, { sessionId, queryId })
    },
    [sessionId],
  )

  return { send, cancel, retryTask, retryQuery }
}

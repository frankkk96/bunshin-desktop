import { useState, useEffect } from 'react'
import { toast } from '@/lib/core/utils/toast'
import { ToolCallParams, ToolCallAction, ToolCallMetadata } from '@/lib/core/extensions/types'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { eventBus } from '@/lib/core/events/event-bus'
import { ToolCallEventType } from '@/lib/core/events/tool-call'

export function useExecutionTime(isExecuting: boolean) {
  const [executionTime, setExecutionTime] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (isExecuting) {
      const interval = setInterval(() => {
        setExecutionTime(Math.floor((Date.now() - startTime) / 1000))
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isExecuting, startTime])

  return executionTime
}

export function useToolCallActions(metadata: ToolCallMetadata, tc: ToolCallParams) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { updateAgent } = useAgentMutations()
  const { data: agent } = useAgentById(metadata.agentId)
  if (!agent) {
    throw new Error('Agent not found')
  }

  const handleAllowAlwaysToolCall = () => {
    updateAgent.mutate({
      ...agent,
      extension: {
        ...agent.extension,
        skipPermission: true,
      },
    })
    eventBus.emit(ToolCallEventType.ToolCallRun, {
      metadata: metadata,
      tc: tc,
    })
  }

  const handleAllowToolCall = () => {
    eventBus.emit(ToolCallEventType.ToolCallRun, {
      metadata: metadata,
      tc: tc,
    })
  }

  const handleRejectToolCall = () => {
    eventBus.emit(ToolCallEventType.ToolCallUpdate, {
      metadata: metadata,
      status: 'rejected',
      text: 'Tool call rejected',
    })
    eventBus.emit(ToolCallEventType.ToolCallDone, {
      metadata: metadata,
    })
  }

  const handleRetry = () => {
    eventBus.emit(ToolCallEventType.ToolCallRun, {
      metadata: metadata,
      tc: tc,
    })
  }

  const handleApproval = (action: ToolCallAction) => {
    try {
      setIsProcessing(true)
      if (action === 'allow_always') {
        handleAllowAlwaysToolCall()
      } else if (action === 'allow') {
        handleAllowToolCall()
      } else if (action === 'reject') {
        handleRejectToolCall()
      } else {
        throw new Error('Invalid action')
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to handle tool call: ${messageText}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    isProcessing,
    handleApproval,
    handleRetry,
  }
}

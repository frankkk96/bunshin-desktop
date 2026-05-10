import { useState } from 'react'
import { ResponseMessage, ToolCallItem } from '@/lib/core/messages/types'
import { useExecutionTime, useToolCallActions } from './ToolCall/hooks'
import { parseArguments } from './ToolCall/utils'
import { ToolCallHeader } from './ToolCall/ToolCallHeader'
import { ToolCallDetails } from './ToolCall/ToolCallDetails'

interface ToolCallContentProps {
  item: ToolCallItem
  message: ResponseMessage
}

export function ToolCallContent({ item, message }: ToolCallContentProps) {
  const metadata = {
    taskId: message.id,
    sessionId: message.sessionId,
    queryId: message.queryId,
    agentId: message.agentId,
    round: message.round,
  }

  const [isExpanded, setIsExpanded] = useState(false)

  const isExecuting = item.status === 'executing'
  const executionTime = useExecutionTime(isExecuting)
  const { isProcessing, handleApproval, handleRetry } = useToolCallActions(metadata, item.tc)

  // Parse arguments for display
  const { parsed: parsedArgs, preview: argsPreview } = parseArguments(item.tc.function.arguments)

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/40 border-border text-foreground/70">
      <ToolCallHeader
        toolCall={item}
        isExpanded={isExpanded}
        isExecuting={isExecuting}
        executionTime={executionTime}
        argsPreview={argsPreview}
        isProcessing={isProcessing}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onApproval={handleApproval}
        onRetry={handleRetry}
      />

      {isExpanded && <ToolCallDetails toolCall={item} parsedArgs={parsedArgs} />}
    </div>
  )
}

import { ToolCallItem } from '@/lib/core/messages/types'

interface ToolCallDetailsProps {
  toolCall: ToolCallItem
  parsedArgs: any
}

export function ToolCallDetails({ toolCall, parsedArgs }: ToolCallDetailsProps) {
  const isFailed = toolCall.status === 'failed'
  const isCompleted = toolCall.status === 'completed'

  // Try to parse result text as JSON for better display
  let parsedResult: any = null
  let resultText = toolCall.text || ''
  try {
    if (toolCall.text) {
      parsedResult = JSON.parse(toolCall.text)
      resultText = JSON.stringify(parsedResult, null, 2)
    }
  } catch {
    // If parsing fails, use original text
    resultText = toolCall.text || ''
  }

  return (
    <div className="px-3 pb-3 pt-0 space-y-2.5 border-t border-border/50">
      {/* Arguments Section */}
      {toolCall.tc.function.arguments && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium opacity-60">Parameters</div>
          <div className="bg-background/50 rounded-md p-2.5 border border-border/50">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono opacity-80">
              {parsedArgs ? JSON.stringify(parsedArgs, null, 2) : toolCall.tc.function.arguments}
            </pre>
          </div>
        </div>
      )}

      {/* Result/Status Section */}
      {toolCall.text && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium opacity-60">
            {isFailed ? 'Error' : isCompleted ? 'Result' : 'Status'}
          </div>
          <div className="bg-background/50 rounded-md p-2.5 border border-border/50">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono opacity-90">
              {resultText}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

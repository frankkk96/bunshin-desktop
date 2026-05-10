import { memo } from 'react'
import { cn } from '@/lib/ui/utils'
import { useAllAgents } from '@/hooks/contacts/agents/query'
import { MessageTypeRenderer } from './MessageTypeRenderer'
import { ResponseHeader } from './ResponseHeader'
import type {
  ResponseMessage as ResponseMessageType,
  ContentItem,
  ReasoningItem,
} from '@/lib/core/messages/types'
import { ResponseMessageActions } from './ResponseMessageActions'
import { LoadingSpinner } from '../Shared/LoadingSpinner'

interface ResponseMessageProps {
  message: ResponseMessageType
  onEdit?: (message: ResponseMessageType) => void
}

export const ResponseMessage = memo(
  function ResponseMessage({ message, onEdit }: ResponseMessageProps) {
    const { data: agents = [] } = useAllAgents()
    const agent = agents.find((a) => a.id === message.agentId)

    if (!agent) {
      return null
    }

    const isPending = message.status === 'pending'
    const isRunning = message.status === 'running'

    return (
      <div className={cn('mb-4 max-w-full relative group/message')} data-message-id={message.id}>
        <div className="flex flex-col">
          <ResponseHeader agent={agent} />
          <div className="flex flex-col mt-1">
            {isPending ? (
              <div className="py-2">
                <LoadingSpinner />
              </div>
            ) : (
              <div className={cn('max-w-full break-words text-base leading-relaxed select-text')}>
                <MessageTypeRenderer message={message} />
                {isRunning ? (
                  <div className="py-2">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <ResponseMessageActions message={message} onEdit={onEdit} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
  (prev, next) => {
    // 只比较关键字段，避免 message 对象引用变化导致不必要的重渲染
    if (prev.message.id !== next.message.id) return false
    if (prev.message.status !== next.message.status) return false
    if (prev.message.error !== next.message.error) return false
    if (prev.onEdit !== next.onEdit) return false

    // 比较 data 数组
    const prevData = prev.message.data
    const nextData = next.message.data
    if (prevData?.length !== nextData?.length) return false

    // 比较最后一项的内容（流式更新主要影响最后一项）
    if (prevData && nextData && prevData.length > 0) {
      const prevLast = prevData[prevData.length - 1]
      const nextLast = nextData[nextData.length - 1]
      if (prevLast.type !== nextLast.type) return false

      // 比较内容类型的文本
      if (prevLast.type === 'content' && nextLast.type === 'content') {
        if ((prevLast as ContentItem).content !== (nextLast as ContentItem).content) return false
      }
      if (prevLast.type === 'reasoning' && nextLast.type === 'reasoning') {
        if ((prevLast as ReasoningItem).reasoning !== (nextLast as ReasoningItem).reasoning)
          return false
      }
    }

    return true
  },
)

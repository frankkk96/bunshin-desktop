import { useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/ui/utils'
import { QueryMessage } from './QueryMessage/QueryMessage'
import { ResponseMessage } from './ResponseMessage/ResponseMessage'
import { EditMessageModal } from './EditMessageModal'
import { useMessages } from '@/hooks/sessions/query'
import type {
  QueryMessage as QueryMessageType,
  ResponseMessage as ResponseMessageType,
} from '@/lib/core/messages/types'

type EditableMessage = QueryMessageType | ResponseMessageType

export function MessageList({ sessionId }: { sessionId: string }) {
  // 获取消息列表（数据库历史 + 实时流）
  const { messages } = useMessages(sessionId)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<EditableMessage | null>(null)

  const handleEdit = useCallback((message: EditableMessage) => {
    setEditingMessage(message)
    setEditModalOpen(true)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false)
    setEditingMessage(null)
  }, [])

  // Reverse only when messages reference actually changes to keep stable snapshot
  const displayMessages = useMemo(() => {
    if (!messages || messages.length === 0) return []
    return [...messages].reverse()
  }, [messages])

  return (
    <div className={cn('flex-1 relative flex flex-col h-full min-h-0')}>
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden min-h-0',
          'flex flex-col-reverse', // Use column-reverse to show newest messages at bottom
          'px-6 font-sans leading-normal',
        )}
      >
        {displayMessages.map((message) => {
          if (message.type === 'query') {
            return <QueryMessage key={message.id} message={message} onEdit={handleEdit} />
          } else if (message.type === 'response') {
            return <ResponseMessage key={message.id} message={message} onEdit={handleEdit} />
          }
          return null
        })}
      </div>

      {/* Edit Message Modal */}
      <EditMessageModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        message={editingMessage}
        sessionId={sessionId}
      />
    </div>
  )
}

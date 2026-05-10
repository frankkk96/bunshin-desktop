import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import {
  MacOSSheet,
  MacOSSheetHeader,
  MacOSSheetTitle,
  MacOSSheetContent,
  MacOSButton,
  MacOSTextarea,
} from '@/components/ui'
import type { QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { eventBus } from '@/lib/core/events/event-bus'
import { MessageEventType } from '@/lib/core/events/message'

type EditableMessage = QueryMessage | ResponseMessage

interface EditMessageModalProps {
  isOpen: boolean
  onClose: () => void
  message: EditableMessage | null
  sessionId: string
}

export function EditMessageModal({ isOpen, onClose, message, sessionId }: EditMessageModalProps) {
  const [content, setContent] = useState('')

  // Get the editable content from the message
  const getMessageContent = useCallback((msg: EditableMessage | null): string => {
    if (!msg) return ''
    if (msg.type === 'query') {
      return msg.text
    } else {
      // For response messages, extract text content
      return msg.data
        .filter((item) => item.type === 'content')
        .map((item) => (item.type === 'content' ? item.content : ''))
        .join('\n\n')
    }
  }, [])

  useEffect(() => {
    if (message) {
      setContent(getMessageContent(message))
    }
  }, [message, getMessageContent])

  const handleSave = () => {
    if (message && content.trim() && sessionId) {
      eventBus.emit(MessageEventType.EditMessage, {
        sessionId,
        messageId: message.id,
        content: content.trim(),
      })
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSave()
    }
  }

  const messageType = message?.type === 'query' ? 'Query' : 'Response'

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="560px" height="auto" placement="center">
      <MacOSSheetHeader compact className="flex items-center justify-between bg-popover">
        <MacOSSheetTitle size="sm">Edit {messageType}</MacOSSheetTitle>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted/80 rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </MacOSSheetHeader>

      <MacOSSheetContent className="p-4">
        <MacOSTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-[220px] text-sm"
          placeholder="Enter message content..."
          autoFocus
        />

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">Press ⌘+Enter to save</span>
          <div className="flex items-center gap-2">
            <MacOSButton variant="outline" size="sm" onClick={onClose}>
              Cancel
            </MacOSButton>
            <MacOSButton size="sm" onClick={handleSave} disabled={!content.trim()}>
              Save
            </MacOSButton>
          </div>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

import { memo, useMemo } from 'react'
import type { QueryMessage as QueryMessageType } from '@/lib/core/messages/types'
import { cn } from '@/lib/ui/utils'
import { QueryMessageBubble } from './QueryMessageBubble'
import { ImageAttachment } from './Attachments/ImageAttachment'
import { VideoAttachment } from './Attachments/VideoAttachment'
import { AudioAttachment } from './Attachments/AudioAttachment'
import { PdfAttachment } from './Attachments/PdfAttachment'
import { QueryMessageActions } from './QueryMessageActions'
import type { ReactNode } from 'react'

interface QueryMessageProps {
  message: QueryMessageType
  onEdit?: (message: QueryMessageType) => void
}

export const QueryMessage = memo(function QueryMessage({ message, onEdit }: QueryMessageProps) {
  const renderedItems = useMemo(() => {
    const mediaNodes: ReactNode[] = []
    const textNodes: ReactNode[] = []

    // Render media attachments
    for (const media of message.medias) {
      if (media.media.type === 'image') {
        mediaNodes.push(
          <ImageAttachment
            key={`${message.id}-${media.media.localPath}`}
            localPath={media.media.localPath}
            name={media.media.name}
          />,
        )
      } else if (media.media.type === 'video') {
        mediaNodes.push(
          <VideoAttachment
            key={`${message.id}-${media.media.localPath}`}
            localPath={media.media.localPath}
            name={media.media.name}
          />,
        )
      } else if (media.media.type === 'audio') {
        mediaNodes.push(
          <AudioAttachment
            key={`${message.id}-${media.media.localPath}`}
            localPath={media.media.localPath}
            name={media.media.name}
          />,
        )
      } else if (media.media.type === 'pdf') {
        mediaNodes.push(
          <PdfAttachment
            key={`${message.id}-${media.media.localPath}`}
            localPath={media.media.localPath}
            name={media.media.name}
          />,
        )
      }
    }

    // Render text content
    if (message.text) {
      textNodes.push(<QueryMessageBubble key={`${message.id}-text`} content={message.text} />)
    }

    return [...mediaNodes, ...textNodes]
  }, [message])

  return (
    <div className={cn('pt-2 mb-2 max-w-full relative group/message')} data-message-id={message.id}>
      <div className="flex flex-col items-end gap-2 relative">
        {renderedItems}
        <QueryMessageActions message={message} onEdit={onEdit} />
      </div>
    </div>
  )
})

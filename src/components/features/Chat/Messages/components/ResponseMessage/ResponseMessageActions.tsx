import { memo, useCallback, useMemo, useState } from 'react'
import type { MediaItem, ResponseMessage } from '@/lib/core/messages/types'
import { formatTimestamp } from '@/lib/ui/utils'
import { toast } from '@/lib/core/utils/toast'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'
import {
  MacOSPopover,
  MacOSPopoverContent,
  MacOSPopoverTrigger,
} from '@/components/ui/macos/macos-popover'

interface MessageActionsProps {
  message: ResponseMessage
  onEdit?: (message: ResponseMessage) => void
}

export const ResponseMessageActions = memo(function ResponseMessageActions({
  message,
  onEdit,
}: MessageActionsProps) {
  const { session } = useSession()
  const { retryTask } = useSessionActions(session?.id)
  const timestamp = formatTimestamp(message.timestamp)
  const [metadataOpen, setMetadataOpen] = useState(false)

  const mediaItems = useMemo(() => {
    return message.data.filter((item): item is MediaItem => item.type === 'media')
  }, [message.data])

  const hasMetadata = useMemo(() => {
    return mediaItems.some(
      (item) => item.media.metadata && Object.keys(item.media.metadata).length > 0,
    )
  }, [mediaItems])

  const getRawContent = useCallback((): string => {
    return message.data
      .filter((item) => item.type === 'content')
      .map((item) => (item.type === 'content' ? item.content : ''))
      .join('\n\n')
  }, [message.data])

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(message)
    }
  }, [onEdit, message])

  const handleCopy = useCallback(() => {
    const content = getRawContent()
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Message copied to clipboard')
    })
  }, [getRawContent])

  const handleRetry = useCallback(() => {
    if (!session?.id) return
    retryTask(message.queryId, message.id)
  }, [retryTask, message.queryId, message.id])

  return (
    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover/message:opacity-100">
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Copy"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button
        onClick={handleEdit}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Edit"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button
        onClick={handleRetry}
        className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
        title="Retry"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 4v6h6"></path>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>
      {hasMetadata && (
        <MacOSPopover open={metadataOpen} onOpenChange={setMetadataOpen}>
          <MacOSPopoverTrigger asChild>
            <button
              className="p-1 hover:bg-muted/80 rounded opacity-50 hover:opacity-100"
              title="View metadata"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </button>
          </MacOSPopoverTrigger>
          <MacOSPopoverContent className="w-80 max-h-96 overflow-auto">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Media Metadata</h4>
              {mediaItems.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.media.name || `${item.media.type} ${index + 1}`}
                  </div>
                  {item.media.metadata && Object.keys(item.media.metadata).length > 0 ? (
                    <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                      {JSON.stringify(item.media.metadata, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-muted-foreground">No metadata</div>
                  )}
                </div>
              ))}
            </div>
          </MacOSPopoverContent>
        </MacOSPopover>
      )}
      <span className="text-xs text-muted-foreground opacity-60 ml-auto">{timestamp}</span>
    </div>
  )
})

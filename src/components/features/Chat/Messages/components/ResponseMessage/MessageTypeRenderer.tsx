import { memo } from 'react'
import type {
  ResponseMessage,
  DataItem,
  ContentItem,
  ReasoningItem,
  ContextItem,
  ToolCallItem,
  MediaItem,
} from '@/lib/core/messages/types'
import { MediaRenderer } from './Media/MediaRenderer'
import { CollapsibleSection } from './Contents/CollapsibleSection'
import { ToolCallContent } from './Contents/ToolCallContent'
import { TextContent } from './Contents/TextContent'
import { ErrorContent } from './Contents/ErrorContent'

interface DataItemRendererProps {
  item: DataItem
  message: ResponseMessage
}

const DataItemRenderer = memo(
  ({ item, message }: DataItemRendererProps) => {
    switch (item.type) {
      case 'content':
        return <TextContent content={item.content} />

      case 'reasoning':
        return <CollapsibleSection label="Reasoning" text={item.reasoning} />

      case 'context':
        return <CollapsibleSection label="Context" text={item.context} />

      case 'tool_call':
        return <ToolCallContent item={item} message={message} />

      case 'media':
        return <MediaRenderer item={item} />

      default:
        return null
    }
  },
  (prev, next) => {
    // 只比较 item 内容，忽略 message 引用变化
    if (prev.item.type !== next.item.type) return false

    switch (prev.item.type) {
      case 'content':
        return (prev.item as ContentItem).content === (next.item as ContentItem).content
      case 'reasoning':
        return (prev.item as ReasoningItem).reasoning === (next.item as ReasoningItem).reasoning
      case 'context':
        return (prev.item as ContextItem).context === (next.item as ContextItem).context
      case 'tool_call': {
        const prevTc = prev.item as ToolCallItem
        const nextTc = next.item as ToolCallItem
        return (
          prevTc.tc.id === nextTc.tc.id &&
          prevTc.status === nextTc.status &&
          prevTc.text === nextTc.text
        )
      }
      case 'media':
        return (prev.item as MediaItem).media.localPath === (next.item as MediaItem).media.localPath
      default:
        return true
    }
  },
)

DataItemRenderer.displayName = 'DataItemRenderer'

export const MessageTypeRenderer = memo(({ message }: { message: ResponseMessage }) => {
  // Handle error separately as it's not in the data array
  if (message.error) {
    return <ErrorContent error={message.error} message={message} />
  }

  // Render all data items
  if (!message.data || message.data.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {message.data.map((item, index) => (
        <DataItemRenderer key={`${item.type}-${index}`} item={item} message={message} />
      ))}
    </div>
  )
})

MessageTypeRenderer.displayName = 'MessageTypeRenderer'

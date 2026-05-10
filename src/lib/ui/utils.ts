import type { Message } from '@/lib/core/messages/types'

export function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function extractTextFromMessage(message: Message) {
  if (message.type === 'query') {
    return message.text
  } else if (message.type === 'response') {
    // Find content items and concatenate their content
    const contentItems = message.data.filter((item) => item.type === 'content')
    if (contentItems.length > 0) {
      return contentItems
        .map((item) => (item.type === 'content' ? item.content : ''))
        .filter(Boolean)
        .join('\n\n')
    }
    // Fall back to tool call text
    const toolCallItem = message.data.find((item) => item.type === 'tool_call')
    if (toolCallItem && toolCallItem.type === 'tool_call') {
      return toolCallItem.text
    }
  }
  return ''
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

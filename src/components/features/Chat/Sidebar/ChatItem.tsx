import { useMemo } from 'react'
import { Avatar } from '@/components/common'
import { cn } from '@/lib/ui/utils'
import { formatRelativeTime } from '@/lib/ui/formatters/time'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { truncateAndHighlight } from '@/lib/ui/formatters/highlight'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { RecentChat } from './useRecentChats'

interface ChatItemProps {
  chat: RecentChat
  // 搜索模式相关属性
  searchMode?: boolean
  searchQuery?: string
  overrideMessage?: string // 用于搜索结果时显示匹配的消息内容
  onClick?: () => void // 用于搜索结果时的自定义点击处理
}

export function ChatItem({
  chat,
  searchMode = false,
  searchQuery = '',
  overrideMessage,
  onClick,
}: ChatItemProps) {
  // 统一的contacts数组
  const { session } = useSession()
  const { navigateToSession } = useAppNavigation()
  const isSelected = useMemo(
    () => !searchMode && session?.id === chat.sessionId,
    [searchMode, session?.id, chat.sessionId],
  )

  const contact = chat.contact

  if (!contact) {
    return null
  }

  // 确定显示的消息内容
  const displayMessage = overrideMessage || chat.lastMessage

  // 处理消息高亮
  const { text: highlightedMessage } =
    searchMode && searchQuery
      ? truncateAndHighlight(displayMessage, searchQuery, 80)
      : { text: displayMessage }

  // 处理点击事件
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigateToSession(chat.sessionId)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 !cursor-default relative',
        isSelected && 'bg-accent',
      )}
    >
      <div className="flex items-center gap-2 w-full text-left">
        <Avatar contact={contact} size={32} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-0.5 w-full">
            <span
              className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 text-foreground`}
            >
              {chat.name}
            </span>
            <span className={`text-xs flex-shrink-0 text-muted-foreground/60`}>
              {formatRelativeTime(chat.lastMessageTime)}
            </span>
          </div>
          <div
            className={`text-xs w-full text-muted-foreground`}
            title={displayMessage} // Show full message on hover
          >
            {searchMode ? (
              <div className="break-words">{highlightedMessage}</div>
            ) : (
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {displayMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

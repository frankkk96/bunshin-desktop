import { IoTimeOutline } from 'react-icons/io5'
import { Star, Trash2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/ui/formatters/time'
import { truncateAndHighlight } from '@/lib/ui/formatters/highlight'
import type { SessionMetadata } from '@/lib/tauri/repo/sessions'

interface SessionItemProps {
  session: SessionMetadata
  // 搜索模式相关属性
  searchMode?: boolean
  searchQuery?: string
  overrideMessage?: string // 用于搜索结果时显示匹配的消息内容
  // 事件处理
  onClick?: () => void
  onToggleFavorite?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
  // 显示控制
  showActions?: boolean // 是否显示收藏和删除按钮
}

export function SessionItem({
  session,
  searchMode = false,
  searchQuery = '',
  overrideMessage,
  onClick,
  onToggleFavorite,
  onDelete,
  showActions = true,
}: SessionItemProps) {
  // 确定显示的消息内容
  const displayMessage = overrideMessage || session.firstMessage || 'New chat'

  // 处理消息高亮
  const { text: highlightedMessage } =
    searchMode && searchQuery
      ? truncateAndHighlight(displayMessage, searchQuery, 100)
      : { text: displayMessage }

  const handleClick = () => {
    onClick?.()
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(e)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(e)
  }

  return (
    <div
      className="group w-full px-2.5 py-1.5 hover:bg-accent cursor-pointer flex items-center gap-2.5"
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-normal text-foreground mb-0.5 leading-snug">
          {searchMode ? (
            <div className="break-words">{highlightedMessage}</div>
          ) : (
            <div className="line-clamp-2">{displayMessage}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <IoTimeOutline size={11} />
            <span>{formatRelativeTime(session.updatedAt)}</span>
          </div>
          <span>·</span>
          <span>
            {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
          </span>
          {session.favorite && (
            <>
              <span>·</span>
              <Star className="h-2.5 w-2.5 text-yellow-500 fill-current" />
            </>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            className={`h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 cursor-pointer ${
              session.favorite
                ? 'text-yellow-500 opacity-100'
                : 'text-muted-foreground/50 opacity-0 group-hover:opacity-100'
            }`}
            onClick={handleToggleFavorite}
          >
            <Star className={`h-3.5 w-3.5 ${session.favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/50 hover:text-red-600 dark:hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

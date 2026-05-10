import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { SidebarContainer } from '@/components/common'
import { ChatItem } from './ChatItem'
import { RecentChat, useRecentChats } from './useRecentChats'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { useMessageSearch } from '@/hooks/sessions/query'
import { useAllContacts } from '@/hooks/contacts/shared/query'
import { extractTextFromMessage } from '@/lib/ui/utils'

export function ChatSidebar({ onNewChatClick }: { onNewChatClick: () => void }) {
  const { navigateToSession } = useAppNavigation()
  const [searchQuery, setSearchQuery] = useState('')

  const { recentChats } = useRecentChats()

  // 统一的contacts数组，不再区分agent和group
  const { data: contacts = [] } = useAllContacts()

  // 搜索消息
  const {
    data: searchResults = [],
    isLoading: isSearchLoading,
    error: searchError,
  } = useMessageSearch(searchQuery, { enabled: !!searchQuery.trim() })

  const { groupedChats } = useMemo(() => {
    const filtered = recentChats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    // 分组显示：先显示pinned chats，再显示非pinned chats
    const pinnedChats = filtered.filter((chat) => chat.pinned)
    const unpinnedChats = filtered.filter((chat) => !chat.pinned)

    const grouped: Record<string, RecentChat[]> = {
      ...(pinnedChats.length > 0 && { PINNED: pinnedChats }),
      ...(unpinnedChats.length > 0 && { RECENT: unpinnedChats }),
    }

    return { groupedChats: grouped }
  }, [recentChats, searchQuery])

  const handleSearchResultClick = (sessionId: string) => {
    navigateToSession(sessionId)
    // 清空搜索查询以显示普通聊天列表
    setSearchQuery('')
  }

  // 渲染搜索结果
  const renderSearchResults = () => {
    if (isSearchLoading) {
      return (
        <div className="p-4 text-center">
          <div className="animate-pulse text-muted-foreground">Searching...</div>
        </div>
      )
    }

    if (searchError) {
      return <div className="p-4 text-center text-destructive">Search failed, please try again</div>
    }

    if (searchResults.length === 0) {
      return (
        <div className="p-4 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <div className="text-sm text-muted-foreground">
            No messages found containing "{searchQuery}"
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="px-3 py-2 text-xs text-muted-foreground border-b">
          Found {searchResults.length} relevant messages
        </div>
        {searchResults.map((result, index) => {
          const { message, session } = result
          if (!session) return null
          const contactInfo = contacts.find((c) => c.id === session.contactId)
          if (!contactInfo) {
            return null
          }
          // 安全地提取消息文本 - 适配新的消息结构
          const messageText = extractTextFromMessage(message)

          // 构造符合新RecentChat类型的对象用于ChatItem
          const chatData: RecentChat = {
            sessionId: session.id,
            contactId: session.contactId,
            contact: contactInfo,
            name: contactInfo?.alias || 'Unknown',
            lastMessage: messageText,
            lastMessageTime: message.timestamp,
            pinned: false,
          }

          return (
            <ChatItem
              key={`${message.id}-${index}`}
              chat={chatData}
              searchMode={true}
              searchQuery={searchQuery}
              overrideMessage={messageText}
              onClick={() => handleSearchResultClick(session.id)}
            />
          )
        })}
      </>
    )
  }

  return (
    <SidebarContainer
      title="Chats"
      headerIcon={<Users size={18} />}
      headerIconTooltip="Create Group"
      onHeaderIconClick={onNewChatClick}
      searchPlaceholder="Search messages..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {/* 如果有搜索查询，显示搜索结果，否则显示分组的聊天列表 */}
      {searchQuery.trim()
        ? renderSearchResults()
        : Object.keys(groupedChats)
            .sort((a, b) => {
              // PINNED 分组永远在最前面
              if (a === 'PINNED') return -1
              if (b === 'PINNED') return 1
              return a.localeCompare(b)
            })
            .map((section) => (
              <div key={section}>
                <h3
                  className={`px-4 py-1 text-xs font-medium uppercase tracking-wide ${
                    section === 'PINNED' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {section === 'PINNED' ? '📌 Pinned' : section === 'RECENT' ? 'Recent' : section}
                </h3>
                {groupedChats[section]?.map((chat) => (
                  <ChatItem key={chat.sessionId} chat={chat} />
                ))}
              </div>
            ))}
    </SidebarContainer>
  )
}

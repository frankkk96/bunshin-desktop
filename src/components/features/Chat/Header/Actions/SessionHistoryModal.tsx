import { IoTimeOutline, IoSearchOutline } from 'react-icons/io5'
import { X, Search } from 'lucide-react'
import { MacOSSheet, MacOSSheetContent, MacOSInput } from '@/components/ui'
import { useMemo, useState } from 'react'
import { useAllSessions } from '@/hooks/sessions/query'
import { useSessionMutations } from '@/hooks/sessions/mutations'
import { useMessageSearch } from '@/hooks/sessions/query'
import { SessionItem } from '../../Sidebar/SessionItem'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { extractTextFromMessage } from '@/lib/ui/utils'
import { SessionMetadata } from '@/lib/tauri/repo/sessions'

interface SessionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  contactId: string
}

export function SessionHistoryModal({ isOpen, onClose, contactId }: SessionHistoryModalProps) {
  const { data: sessions = [], isLoading } = useAllSessions()
  const { deleteSession, updateSessionFavorite } = useSessionMutations()
  const { navigateToSession } = useAppNavigation()
  const [searchQuery, setSearchQuery] = useState('')

  // 搜索消息（限制在当前contactId范围内）
  const {
    data: searchResults = [],
    isLoading: isSearchLoading,
    error: searchError,
  } = useMessageSearch(searchQuery, { enabled: !!searchQuery.trim(), contactId })

  // Filter by contact, exclude sessions with 0 messages, and sort by favorite first, then by last updated
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(
        (session: SessionMetadata) =>
          session.contactId === contactId && (session.messageCount || 0) > 0,
      )
      .sort((a: SessionMetadata, b: SessionMetadata) => {
        // Favorite sessions come first
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        // Then sort by last updated
        return (b.updatedAt || 0) - (a.updatedAt || 0)
      })
  }, [sessions, contactId])

  const handleSessionClick = (sessionId: string) => {
    navigateToSession(sessionId)
    onClose()
  }

  const handleToggleFavorite = (
    e: React.MouseEvent,
    sessionId: string,
    currentFavorite: boolean,
  ) => {
    e.stopPropagation()
    updateSessionFavorite.mutate({ sessionId, favorite: !currentFavorite })
  }

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    deleteSession.mutate(sessionId)
  }

  const handleSearchResultClick = (sessionId: string) => {
    navigateToSession(sessionId)
    onClose()
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  // 渲染搜索结果
  const renderSearchResults = () => {
    if (isSearchLoading) {
      return (
        <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary/60 mb-1.5"></div>
          <div className="text-[11px]">Searching...</div>
        </div>
      )
    }

    if (searchError) {
      return (
        <div className="h-[280px] flex flex-col items-center justify-center text-destructive">
          <div className="text-[11px]">Search failed</div>
        </div>
      )
    }

    if (searchResults.length === 0) {
      return (
        <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
          <Search className="h-8 w-8 opacity-20 mb-2" />
          <div className="text-[11px] text-muted-foreground/70">No results found</div>
        </div>
      )
    }

    return (
      <div className="space-y-px">
        <div className="px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
          {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
        </div>
        {searchResults.map((result, index) => {
          const { message, session } = result
          if (!session) return null

          return (
            <SessionItem
              key={`${message.id}-${index}`}
              session={session}
              searchMode={true}
              searchQuery={searchQuery}
              overrideMessage={extractTextFromMessage(message)}
              onClick={() => handleSearchResultClick(session.id)}
              showActions={false}
            />
          )
        })}
      </div>
    )
  }

  return (
    <MacOSSheet
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="480px"
      height="480px"
      placement="top-right"
    >
      {/* Search Bar */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/20 bg-popover">
        <div className="relative">
          <IoSearchOutline
            size={14}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <MacOSInput
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-2"
          />
          {searchQuery && (
            <button
              className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-5 w-5 flex items-center justify-center hover:bg-muted/50 rounded cursor-pointer"
              onClick={clearSearch}
            >
              <X className="h-2.5 w-2.5 text-muted-foreground/50" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <MacOSSheetContent className="px-1.5 pb-1.5">
        <div className="min-h-[280px]">
          {isLoading ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary/60 mb-1.5"></div>
              <p className="text-[11px]">Loading...</p>
            </div>
          ) : searchQuery.trim() ? (
            <div className="min-h-[280px]">{renderSearchResults()}</div>
          ) : filteredSessions.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
              <IoTimeOutline size={32} className="opacity-15 mb-2" />
              <p className="text-[11px] text-muted-foreground/70">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-px min-h-[280px] pt-1">
              {filteredSessions.map((session: SessionMetadata) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session.id)}
                  onToggleFavorite={(e) =>
                    handleToggleFavorite(e, session.id, session.favorite || false)
                  }
                  onDelete={(e) => handleDeleteSession(e, session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChatWindow } from '@/components/features/Chat'
import { ChatSidebar } from './Sidebar/ChatSidebar'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { GroupCreationModal } from '@/components/features/Groups/GroupCreationModal'
import { useRecentChats } from './Sidebar/useRecentChats'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'

function ChatViewContent() {
  const { session } = useSession()
  const { navigateToSession } = useAppNavigation()
  const [showGroupModal, setShowGroupModal] = useState(false)

  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>()
  const { recentChats, isLoading } = useRecentChats()

  // 当路径中没有 sessionId 时，自动选中第一个 session
  useEffect(() => {
    // 仅在当前路由不包含 sessionId（即位于 /chats 根路径）时才自动导航
    if (!routeSessionId && !session && !isLoading && recentChats.length > 0) {
      navigateToSession(recentChats[0].sessionId)
    }
  }, [routeSessionId, session, recentChats, isLoading, navigateToSession])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat List Panel */}
      <ChatSidebar onNewChatClick={() => setShowGroupModal(true)} />

      {/* Chat Window Panel */}
      <div className="flex-1 overflow-hidden bg-background">
        {session ? (
          <ChatWindow />
        ) : (
          <div className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground">
            <div className="text-lg font-semibold">No chats found</div>
            <div className="text-sm">Start your first chat</div>
          </div>
        )}
      </div>

      <GroupCreationModal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} />
    </div>
  )
}

// 不再需要 ChatProvider！
export function ChatView() {
  return <ChatViewContent />
}

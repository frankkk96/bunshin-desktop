import { Suspense } from 'react'
import { InputBar } from '@/components/features/Chat'
import { MessageList } from './Messages/components/MessageList'
import { ChatHeader } from './Header/ChatHeader'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { InputStateProvider } from './Input/InputStateProvider'
import { InputComposerProvider } from './Input/InputComposerProvider'

function MessageListLoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full animate-pulse bg-muted" />
          <div className="flex-1 space-y-2">
            <div
              className="h-4 rounded animate-pulse bg-muted"
              style={{
                width: `${60 + Math.random() * 30}%`,
              }}
            />
            <div
              className="h-4 rounded animate-pulse bg-muted"
              style={{
                width: `${40 + Math.random() * 40}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatWindow() {
  // 使用新的数据架构
  const { session, contact } = useSession()

  // 如果没有 sessionId，显示空状态
  if (!session || !contact) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No chat selected</div>
          <div className="text-sm text-gray-500">Select a chat from the sidebar</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with integrated status */}
      <ChatHeader session={session} />
      <Suspense fallback={<MessageListLoadingSkeleton />}>
        <MessageList sessionId={session.id} />
      </Suspense>
      <InputStateProvider>
        <InputComposerProvider>
          <InputBar />
        </InputComposerProvider>
      </InputStateProvider>
    </div>
  )
}

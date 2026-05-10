import { useCallback, useState } from 'react'
import { SessionHistoryModal } from './Actions/SessionHistoryModal'
import { ExecutionStatus } from './Execution/ExecutionStatus'
import { ContactInfo } from './Contact/ContactInfo'
import { WindowsHeaderControls } from './WindowsHeaderControls'
import { useAppNavigation } from '@/components/common/Layout/useAppNavigation'
import { handleApiError } from '@/lib/core/utils/error'
import { useSessionMutations } from '@/hooks/sessions/mutations'
import { sessionId } from '@/lib/core/utils/random'
import { SessionMetadata } from '@/lib/tauri/repo/sessions'

export function ChatHeader({ session }: { session: SessionMetadata }) {
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const sessionMutations = useSessionMutations()
  const { navigateToSession } = useAppNavigation()

  const handleNewChat = useCallback(
    async (contactId: string) => {
      if (!contactId) {
        throw new Error('No contact ID provided')
      }
      const newSessionId = sessionId()
      sessionMutations.createSession.mutate(
        {
          sessionId: newSessionId,
          contactId: contactId,
        },
        {
          onSuccess: () => {
            navigateToSession(newSessionId)
          },
          onError: (error) => {
            handleApiError(error)
          },
        },
      )
    },
    [sessionMutations, navigateToSession],
  )

  return (
    <>
      <div
        data-tauri-drag-region
        className="border-b flex items-center justify-between bg-background backdrop-blur-sm"
      >
        {/* Left: Contact Info & Status */}
        <div className="p-3.5 flex items-center gap-3">
          <ContactInfo />
          <ExecutionStatus />
        </div>

        {/* Right: Action Buttons with Window Controls for Windows */}
        <WindowsHeaderControls
          contactId={session.contactId}
          onNewChat={handleNewChat}
          onShowHistory={() => setShowHistoryModal(true)}
        />
      </div>

      {/* History Modal */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        contactId={session.contactId}
      />
    </>
  )
}

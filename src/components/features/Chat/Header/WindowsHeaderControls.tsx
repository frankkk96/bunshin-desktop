import { useEffect, useState } from 'react'
import { type } from '@tauri-apps/plugin-os'
import { HeaderActions } from './Actions/HeaderActions'

interface WindowsHeaderControlsProps {
  contactId: string
  onNewChat: (contactId: string) => void
  onShowHistory: () => void
}

export function WindowsHeaderControls({
  contactId,
  onNewChat,
  onShowHistory,
}: WindowsHeaderControlsProps) {
  const [isWindows, setIsWindows] = useState(false)

  useEffect(() => {
    const checkPlatform = async () => {
      const osType = type()
      setIsWindows(osType === 'windows')
    }
    checkPlatform()
  }, [])

  if (isWindows) {
    return (
      <div className="pr-4.5 pt-6">
        {/* Chat actions positioned normally */}
        <HeaderActions contactId={contactId} onNewChat={onNewChat} onShowHistory={onShowHistory} />
      </div>
    )
  }

  // Non-Windows: just show the chat actions normally
  return <HeaderActions contactId={contactId} onNewChat={onNewChat} onShowHistory={onShowHistory} />
}

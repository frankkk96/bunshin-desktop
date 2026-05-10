import { IoCreateOutline, IoTimeOutline } from 'react-icons/io5'
import {
  MacOSButton,
  MacOSTooltip,
  MacOSTooltipContent,
  MacOSTooltipTrigger,
} from '@/components/ui'

interface HeaderActionsProps {
  contactId: string
  onNewChat: (contactId: string) => void
  onShowHistory: () => void
}

export function HeaderActions({ contactId, onNewChat, onShowHistory }: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 mr-2.5">
      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <MacOSButton onClick={() => onNewChat(contactId)} variant="icon" size="lg">
            <IoCreateOutline size={20} />
          </MacOSButton>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent>
          <p>New Chat</p>
        </MacOSTooltipContent>
      </MacOSTooltip>

      <MacOSTooltip>
        <MacOSTooltipTrigger asChild>
          <MacOSButton onClick={onShowHistory} variant="icon" size="lg">
            <IoTimeOutline size={20} />
          </MacOSButton>
        </MacOSTooltipTrigger>
        <MacOSTooltipContent>
          <p>History</p>
        </MacOSTooltipContent>
      </MacOSTooltip>
    </div>
  )
}

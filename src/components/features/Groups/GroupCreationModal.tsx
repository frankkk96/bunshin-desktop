import { MacOSSheet, MacOSSheetContent } from '@/components/ui'
import { GroupCreation } from '@/components/features/Groups'

interface GroupCreationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GroupCreationModal({ isOpen, onClose }: GroupCreationModalProps) {
  const handleSuccess = () => {
    onClose()
  }

  return (
    <MacOSSheet
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="320px"
      height="500px"
      placement="top-left"
    >
      <MacOSSheetContent className="px-4 pt-4">
        <GroupCreation onSuccess={handleSuccess} />
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { MacOSButton, MacOSSheet, MacOSSheetContent, MacOSTextarea } from '@/components/ui'
import { ask } from '@tauri-apps/plugin-dialog'

interface SystemPromptModalProps {
  isOpen: boolean
  onClose: () => void
  value: string
  onSave: (value: string) => void
}

export function SystemPromptModal({ isOpen, onClose, value, onSave }: SystemPromptModalProps) {
  const [editValue, setEditValue] = useState(value)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEditValue(value)
      setHasChanges(false)
    }
  }, [isOpen, value])

  useEffect(() => {
    setHasChanges(editValue !== value)
  }, [editValue, value])

  const handleSave = () => {
    onSave(editValue)
    onClose()
  }

  const handleClose = async () => {
    if (hasChanges) {
      try {
        const confirmed = await ask('You have unsaved changes. Are you sure you want to close?', {
          title: 'Unsaved Changes',
          kind: 'warning',
        })
        if (!confirmed) return
      } catch (error) {
        return
      }
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Cmd+S or Ctrl+S
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <MacOSSheet isOpen={isOpen} onClose={handleClose} maxWidth="500px" height="300px">
      <MacOSSheetContent className="p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">System Prompt</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define the behavior and personality of your agent
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-background cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          <MacOSTextarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your system prompt here..."
            className="w-full h-full min-h-[100px]"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="border-t border-border/20 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground/60">
            {hasChanges ? (
              <span className="text-amber-500">Unsaved changes</span>
            ) : (
              <span>Tip: Press Cmd+S to save</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MacOSButton onClick={handleClose} variant="outline" size="sm">
              Cancel
            </MacOSButton>
            <MacOSButton onClick={handleSave} disabled={!hasChanges} variant="default" size="sm">
              Save
            </MacOSButton>
          </div>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

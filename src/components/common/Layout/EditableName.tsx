import { useState } from 'react'
import { IoCheckmark, IoPencilOutline, IoClose } from 'react-icons/io5'
import { MacOSButton, MacOSInput } from '@/components/ui'

interface EditableNameProps {
  name: string
  onSave: (newName: string) => void
  className?: string
  validateName?: (name: string) => { valid: boolean; error?: string }
  checkDuplicate?: (name: string) => Promise<boolean>
}

export function EditableName({
  name,
  onSave,
  className = '',
  validateName,
  checkDuplicate,
}: EditableNameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleStartEdit = () => {
    setEditedName(name)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmedName = editedName.trim()

    // Check if name is empty
    if (!trimmedName) {
      setError('Name cannot be empty')
      return
    }

    // Check if name hasn't changed
    if (trimmedName === name) {
      setIsEditing(false)
      setError(null)
      return
    }

    // Validate name format if validator provided
    if (validateName) {
      const validation = validateName(trimmedName)
      if (!validation.valid) {
        setError(validation.error || 'Invalid name format')
        return
      }
    }

    // Check for duplicates if checker provided
    if (checkDuplicate) {
      try {
        const isDuplicate = await checkDuplicate(trimmedName)
        if (isDuplicate) {
          setError('This name is already taken')
          return
        }
      } catch (err) {
        setError('Failed to check name availability')
        return
      }
    }

    onSave(trimmedName)
    setIsEditing(false)
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedName('')
    setError(null)
  }

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2">
          <MacOSInput
            value={editedName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEditedName(e.target.value)
              setError(null) // Clear error on typing
            }}
            onKeyDown={handleKeyPress}
            className={`text-2xl font-bold max-w-[300px] text-foreground ${
              error ? 'border-destructive focus:ring-destructive' : ''
            }`}
            autoFocus
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
          />
          <MacOSButton size="sm" variant="ghost" onClick={handleSave}>
            <IoCheckmark size={16} />
          </MacOSButton>
          <MacOSButton size="sm" variant="ghost" onClick={handleCancel}>
            <IoClose size={16} />
          </MacOSButton>
        </div>
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <MacOSButton
      variant="ghost"
      className={`flex items-center gap-2 h-auto p-1 justify-start text-foreground ${className}`}
      onClick={handleStartEdit}
    >
      <h1 className="text-2xl font-bold m-0">{name}</h1>
      <IoPencilOutline size={14} className="opacity-50 text-muted-foreground" />
    </MacOSButton>
  )
}

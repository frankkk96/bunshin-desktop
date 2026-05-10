import { MessageSquare, Plus } from 'lucide-react'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import type { Group } from '@/lib/core/group/types'
import { useState } from 'react'
import { PromptRow } from '@/components/features/Agents/Custom/components/Prompts/PromptRow'
import { PromptModal } from '@/components/features/Agents/Custom/components/Prompts/PromptModal'
import { Prompt } from '@/lib/core/agent/types'
import type { QueryParams } from '@/lib/core/execution/types'
import { ask } from '@tauri-apps/plugin-dialog'
import { useContact } from '@/hooks/contacts/shared/query'

interface PromptsSectionProps {
  group: Group
  onUpdate: (updates: Partial<Group>) => void
}

export function PromptsSection({ group, onUpdate }: PromptsSectionProps) {
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>(undefined)

  const { data: contact } = useContact(group.id)
  if (!contact) {
    return null
  }

  const handleShortcutsUpdate = (shortcuts: Prompt[]) => {
    onUpdate({
      shortcuts,
    })
  }

  const prompts = group.shortcuts || []

  const handleCreatePrompt = () => {
    setEditingPrompt(undefined)
    setPromptModalOpen(true)
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setPromptModalOpen(true)
  }

  const handleSavePrompt = (data: { key: string; queries: QueryParams[] }) => {
    if (editingPrompt) {
      // Update existing prompt
      const updatedPrompts = prompts.map((p) =>
        p.id === editingPrompt.id
          ? {
              ...p,
              key: data.key,
              queries: data.queries,
              updatedAt: Date.now(),
            }
          : p,
      )
      handleShortcutsUpdate(updatedPrompts)
      setPromptModalOpen(false)
      setEditingPrompt(undefined)
    } else {
      // Create new prompt
      const newPrompt: Prompt = {
        id: Date.now().toString(),
        key: data.key.trim(),
        queries: data.queries,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      handleShortcutsUpdate([...prompts, newPrompt])
      setPromptModalOpen(false)
    }
  }

  const handleDeletePrompt = async () => {
    if (!editingPrompt) return

    try {
      const confirmed = await ask(
        `Are you sure you want to delete "${editingPrompt.key}"? This action cannot be undone.`,
        { title: 'Confirm Delete', kind: 'warning' },
      )

      if (!confirmed) return

      const updatedPrompts = prompts.filter((p) => p.id !== editingPrompt.id)
      handleShortcutsUpdate(updatedPrompts)
      setPromptModalOpen(false)
      setEditingPrompt(undefined)
    } catch (error) {
      console.error('Delete confirmation error:', error)
    }
  }

  return (
    <SettingSection title="Prompts" icon={MessageSquare}>
      <div className="px-4 py-2">
        <div className="space-y-px">
          {prompts.map((prompt) => (
            <PromptRow key={prompt.id} prompt={prompt} onEdit={handleEditPrompt} />
          ))}

          {/* Add Prompt Button */}
          <button
            onClick={handleCreatePrompt}
            className="w-full flex items-center gap-2 px-3 py-1 text-sm bg-transparent hover:bg-accent rounded border border-dashed border-border/30 cursor-pointer"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-muted/50 text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-sm text-muted-foreground">Add Prompt</span>
          </button>
        </div>
      </div>
      <PromptModal
        contact={contact}
        isOpen={promptModalOpen}
        onClose={() => {
          setPromptModalOpen(false)
          setEditingPrompt(undefined)
        }}
        onSave={handleSavePrompt}
        onDelete={editingPrompt ? handleDeletePrompt : undefined}
        editingPrompt={editingPrompt}
      />
    </SettingSection>
  )
}

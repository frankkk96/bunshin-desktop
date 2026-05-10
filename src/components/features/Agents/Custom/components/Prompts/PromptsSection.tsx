import { MessageSquare, FileText, List } from 'lucide-react'
import { SettingSection } from '@/components/features/Settings/components/SettingSection'
import { SettingDivider } from '@/components/features/Settings/components/SettingDivider'
import { SettingRow } from '@/components/features/Settings/components/SettingRow'
import { SettingModal } from '@/components/features/Settings/components/SettingModal'
import type { Agent } from '@/lib/core/agent/types'
import { useState } from 'react'
import { SystemPromptModal } from './SystemPromptModal'
import { agentToContact } from '@/lib/core/agent/types'
import { Prompt } from '@/lib/core/agent/types'
import { PromptListModal } from './PromptListModal'

interface PromptsSectionProps {
  agent: Agent
  onUpdate: (updates: Partial<Agent>) => void
}

export function PromptsSection({ agent, onUpdate }: PromptsSectionProps) {
  const [systemPromptModalOpen, setSystemPromptModalOpen] = useState(false)
  const [promptListModalOpen, setPromptListModalOpen] = useState(false)

  const handleSystemPromptSave = (systemPrompt: string) => {
    onUpdate({
      prompt: { ...agent.prompt, systemPrompt },
    })
  }

  const handleShortcutsUpdate = (shortcuts: Prompt[]) => {
    onUpdate({
      prompt: { ...agent.prompt, shortcuts },
    })
  }

  const systemPrompt = agent.prompt.systemPrompt || ''
  const systemPromptPreview = systemPrompt.trim()
    ? systemPrompt.length > 30
      ? systemPrompt.slice(0, 30) + '...'
      : systemPrompt
    : 'Not configured'

  const prompts = agent.prompt.shortcuts || []
  const promptsCount = prompts.length

  return (
    <>
      <SettingSection title="Prompts" icon={MessageSquare}>
        <SettingRow
          icon={<FileText className="w-4 h-4" />}
          title="System Prompt"
          description={systemPromptPreview}
        >
          <SettingModal label="Configure" onClick={() => setSystemPromptModalOpen(true)} />
        </SettingRow>

        <SettingDivider />

        <SettingRow
          icon={<List className="w-4 h-4" />}
          title="Prompts"
          description={promptsCount > 0 ? `${promptsCount} prompt${promptsCount > 1 ? 's' : ''}` : 'No prompts'}
        >
          <SettingModal
            label={promptsCount > 0 ? `${promptsCount} prompt${promptsCount > 1 ? 's' : ''}` : 'Add...'}
            onClick={() => setPromptListModalOpen(true)}
          />
        </SettingRow>
      </SettingSection>

      <SystemPromptModal
        isOpen={systemPromptModalOpen}
        onClose={() => setSystemPromptModalOpen(false)}
        value={systemPrompt}
        onSave={handleSystemPromptSave}
      />

      <PromptListModal
        isOpen={promptListModalOpen}
        onClose={() => setPromptListModalOpen(false)}
        contact={agentToContact(agent)}
        onUpdate={handleShortcutsUpdate}
      />
    </>
  )
}

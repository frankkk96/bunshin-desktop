import { useState } from 'react'
import {
  MacOSButton,
  MacOSInput,
  MacOSLabel,
  MacOSSelect,
  MacOSSelectContent,
  MacOSSelectItem,
  MacOSSelectTrigger,
  MacOSSelectValue,
  MacOSSheet,
  MacOSSheetContent,
  MacOSSheetDescription,
  MacOSSheetHeader,
  MacOSSheetTitle,
} from '@/components/ui'
import { useCreateAgent } from '@/hooks/agents'
import { toast } from '@/lib/core/utils/toast'
import type { Agent, ProviderType } from '@/lib/types'

interface AgentCreationModalProps {
  onClose: () => void
  onCreated: (agent: Agent) => void
}

export function AgentCreationModal({ onClose, onCreated }: AgentCreationModalProps) {
  const createAgent = useCreateAgent()

  const [alias, setAlias] = useState('')
  const [type, setType] = useState<ProviderType>('subscription')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  const handleCreate = async () => {
    if (!alias.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      const agent = await createAgent.mutateAsync({
        alias: alias.trim(),
        description: null,
        avatar: null,
        providerType: type,
        baseUrl: type === 'api' ? baseUrl.trim() || null : null,
        apiKey: type === 'api' ? apiKey || undefined : undefined,
      })
      onCreated(agent)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const typeHint =
    type === 'subscription'
      ? 'Uses an isolated Claude login — sign in once after creating (in the agent editor).'
      : 'Custom base URL + API key (Anthropic, OpenRouter, a self-hosted proxy, etc.).'

  return (
    <MacOSSheet isOpen onClose={onClose} maxWidth="480px" height="auto">
      <MacOSSheetHeader>
        <MacOSSheetTitle>New agent</MacOSSheetTitle>
        <MacOSSheetDescription>
          The auth type is locked once the agent is created. Duplicate an agent to
          reuse its setup with tweaks.
        </MacOSSheetDescription>
      </MacOSSheetHeader>
      <MacOSSheetContent className="px-6 py-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <MacOSLabel>Name</MacOSLabel>
            <MacOSInput
              autoFocus
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. Codey"
            />
          </div>

          <div className="space-y-1.5">
            <MacOSLabel>Type</MacOSLabel>
            <MacOSSelect value={type} onValueChange={(v) => setType(v as ProviderType)}>
              <MacOSSelectTrigger className="w-full">
                <MacOSSelectValue />
              </MacOSSelectTrigger>
              <MacOSSelectContent>
                <MacOSSelectItem value="subscription">Claude subscription</MacOSSelectItem>
                <MacOSSelectItem value="api">Claude-compatible API</MacOSSelectItem>
              </MacOSSelectContent>
            </MacOSSelect>
            <p className="text-xs text-muted-foreground">{typeHint}</p>
          </div>

          {type === 'api' && (
            <>
              <div className="space-y-1.5">
                <MacOSLabel>Base URL</MacOSLabel>
                <MacOSInput
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.anthropic.com"
                />
              </div>
              <div className="space-y-1.5">
                <MacOSLabel>API key</MacOSLabel>
                <MacOSInput
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <MacOSButton variant="ghost" onClick={onClose}>
            Cancel
          </MacOSButton>
          <MacOSButton onClick={handleCreate} disabled={createAgent.isPending}>
            {createAgent.isPending ? 'Creating…' : 'Create'}
          </MacOSButton>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

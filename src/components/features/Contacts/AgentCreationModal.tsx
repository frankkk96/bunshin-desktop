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
import { useProviders } from '@/hooks/providers'
import { toast } from '@/lib/core/utils/toast'
import type { Agent } from '@/lib/types'

interface AgentCreationModalProps {
  onClose: () => void
  onCreated: (agent: Agent) => void
}

export function AgentCreationModal({ onClose, onCreated }: AgentCreationModalProps) {
  const { data: providers = [] } = useProviders()
  const createAgent = useCreateAgent()

  const [alias, setAlias] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState('')
  const [providerId, setProviderId] = useState<string | undefined>(providers[0]?.id)

  const handleCreate = async () => {
    if (!alias.trim()) {
      toast.error('Name is required')
      return
    }
    if (!providerId) {
      toast.error('Pick a provider')
      return
    }
    try {
      const agent = await createAgent.mutateAsync({
        alias: alias.trim(),
        description: description.trim() || null,
        avatar: avatar.trim() || null,
        pinned: false,
        providerId,
      })
      onCreated(agent)
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <MacOSSheet isOpen onClose={onClose} maxWidth="480px" height="auto">
      <MacOSSheetHeader>
        <MacOSSheetTitle>New Agent</MacOSSheetTitle>
        <MacOSSheetDescription>
          Pick a provider once — it can not be changed later.
        </MacOSSheetDescription>
      </MacOSSheetHeader>
      <MacOSSheetContent>
        <div className="space-y-3">
          <div>
            <MacOSLabel>Name</MacOSLabel>
            <MacOSInput
              autoFocus
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. Codey"
            />
          </div>
          <div>
            <MacOSLabel>Avatar (optional emoji)</MacOSLabel>
            <MacOSInput
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              maxLength={4}
              placeholder="🤖"
            />
          </div>
          <div>
            <MacOSLabel>Description</MacOSLabel>
            <MacOSInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this agent is for"
            />
          </div>
          <div>
            <MacOSLabel>Provider</MacOSLabel>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No providers configured yet. Go to Settings → Providers first.
              </p>
            ) : (
              <MacOSSelect value={providerId} onValueChange={(v) => setProviderId(v)}>
                <MacOSSelectTrigger>
                  <MacOSSelectValue placeholder="Pick a provider" />
                </MacOSSelectTrigger>
                <MacOSSelectContent>
                  {providers.map((p) => (
                    <MacOSSelectItem key={p.id} value={p.id}>
                      {p.name} · {p.type}
                    </MacOSSelectItem>
                  ))}
                </MacOSSelectContent>
              </MacOSSelect>
            )}
          </div>
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

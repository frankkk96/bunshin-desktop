import { useEffect, useState } from 'react'
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
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import type { Agent } from '@/lib/types'

interface AgentCreationModalProps {
  onClose: () => void
  onCreated: (agent: Agent) => void
}

export function AgentCreationModal({ onClose, onCreated }: AgentCreationModalProps) {
  const providersQuery = useProviders()
  const providers = providersQuery.data ?? []
  const createAgent = useCreateAgent()

  const [alias, setAlias] = useState('')
  const [providerId, setProviderId] = useState<string | undefined>(providers[0]?.id)

  // Refresh on open so a freshly-created provider appears without restart.
  useEffect(() => {
    void providersQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The provider settings live in a separate window; when the user comes back to
  // this one (e.g. after adding a provider), refetch so the new one shows up.
  useEffect(() => {
    const onFocus = () => void providersQuery.refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!providerId && providers[0]) {
      setProviderId(providers[0].id)
    }
  }, [providers, providerId])

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
        description: null,
        avatar: null,
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
          The provider (and therefore the model) is locked once the agent is
          created. Create another agent to use a different provider.
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
            <MacOSLabel>Provider</MacOSLabel>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No providers configured yet.{' '}
                <button
                  type="button"
                  onClick={() => void openSettingsWindow('providers')}
                  className="text-interactive hover:underline underline-offset-2 cursor-pointer"
                >
                  Set up a provider
                </button>{' '}
                to continue.
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

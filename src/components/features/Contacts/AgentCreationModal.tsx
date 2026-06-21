import { useState } from 'react'
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useCreateAgent } from '@/hooks/agents'
import { toast } from '@/lib/core/utils/toast'
import type { Agent } from '@/lib/types'

interface AgentCreationModalProps {
  onClose: () => void
  onCreated: (agent: Agent) => void
}

export function AgentCreationModal({ onClose, onCreated }: AgentCreationModalProps) {
  const createAgent = useCreateAgent()

  const [alias, setAlias] = useState('')
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
        baseUrl: baseUrl.trim() || null,
        apiKey: apiKey || undefined,
      })
      onCreated(agent)
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="480px" height="auto">
      <SheetHeader>
        <SheetTitle>New agent</SheetTitle>
        <SheetDescription>
          Connect an Anthropic-compatible API. Leave the base URL empty to use
          api.anthropic.com. Duplicate an agent to reuse its setup with tweaks.
        </SheetDescription>
      </SheetHeader>
      <SheetContent className="px-6 py-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              autoFocus
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. Codey"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.anthropic.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createAgent.isPending}>
            {createAgent.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

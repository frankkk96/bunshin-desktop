import { useEffect, useRef, useState } from 'react'
import { Camera, Copy, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
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
import { AgentAvatar } from '@/components/common'
import { SettingSection } from '../components/SettingSection'
import { AgentConfigSection } from '@/components/features/Contacts/AgentConfigSection'
import { AgentCreationModal } from '@/components/features/Contacts/AgentCreationModal'
import {
  useAgents,
  useDeleteAgent,
  useDuplicateAgent,
  useHasAgentApiKey,
  useUpdateAgent,
} from '@/hooks/agents'
import { agentsApi } from '@/lib/tauri/service/agents'
import { toast } from '@/lib/core/utils/toast'
import type { Agent } from '@/lib/types'

export function AgentsSection() {
  const { data: agents = [] } = useAgents()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)

  // Track the latest version of the open agent (config saves refetch the list).
  const editingLive = editing ? agents.find((a) => a.id === editing.id) ?? editing : null

  return (
    <SettingSection title="Agents">
      <div className="px-4 py-3 space-y-3">
        {agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No agents yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              An agent pairs an API key with a saved Claude Code config.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a} onEdit={() => setEditing(a)} />
            ))}
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => setCreating(true)}
          className="w-full justify-center"
        >
          <Plus size={14} className="mr-1" />
          New agent
        </Button>
      </div>

      {creating && (
        <AgentCreationModal
          onClose={() => setCreating(false)}
          onCreated={(agent) => {
            setCreating(false)
            setEditing(agent)
          }}
        />
      )}

      {editingLive && <AgentEditor agent={editingLive} onClose={() => setEditing(null)} />}
    </SettingSection>
  )
}

function agentSubtitle(agent: Agent): string {
  return agent.baseUrl || 'api.anthropic.com'
}

function AgentCard({ agent, onEdit }: { agent: Agent; onEdit: () => void }) {
  const deleteAgent = useDeleteAgent()
  const duplicateAgent = useDuplicateAgent()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete agent "${agent.alias}"? Sessions belonging to it block deletion.`)) return
    try {
      await deleteAgent.mutateAsync(agent.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await duplicateAgent.mutateAsync(agent.id)
      toast.success('Agent duplicated')
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <div className="group rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <AgentAvatar agent={agent} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{agent.alias}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5" title={agentSubtitle(agent)}>
            {agentSubtitle(agent)}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDuplicate}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={onEdit}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={handleDelete}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface MediaPickerResult {
  media: { localPath: string; name: string; type: string; mimeType: string } | null
  cancelled: boolean
  error: string | null
}

function AgentEditor({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()
  const duplicateAgent = useDuplicateAgent()
  const { data: hasKey, refetch: refetchKey } = useHasAgentApiKey(agent.id)

  const [name, setName] = useState(agent.alias)
  const [description, setDescription] = useState(agent.description ?? '')
  const [baseUrl, setBaseUrl] = useState(agent.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const lastSavedName = useRef(agent.alias)
  const lastSavedDesc = useRef(agent.description ?? '')
  const lastSavedBaseUrl = useRef(agent.baseUrl ?? '')

  useEffect(() => {
    setName(agent.alias)
    setDescription(agent.description ?? '')
    setBaseUrl(agent.baseUrl ?? '')
    setApiKey('')
    lastSavedName.current = agent.alias
    lastSavedDesc.current = agent.description ?? ''
    lastSavedBaseUrl.current = agent.baseUrl ?? ''
  }, [agent.id])

  const persist = (patch: Partial<{ alias: string; description: string | null; baseUrl: string | null }>) =>
    updateAgent.mutateAsync({
      id: agent.id,
      alias: patch.alias ?? agent.alias,
      description: patch.description !== undefined ? patch.description : agent.description,
      avatar: agent.avatar,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl : agent.baseUrl,
    })

  const handleNameBlur = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === lastSavedName.current) {
      setName(lastSavedName.current)
      return
    }
    try {
      await persist({ alias: trimmed })
      lastSavedName.current = trimmed
    } catch (err) {
      toast.error(`Failed to rename: ${err}`)
    }
  }

  const handleDescriptionBlur = async () => {
    const trimmed = description.trim()
    if (trimmed === lastSavedDesc.current) return
    try {
      await persist({ description: trimmed || null })
      lastSavedDesc.current = trimmed
    } catch (err) {
      toast.error(`Failed to save description: ${err}`)
    }
  }

  const handleBaseUrlBlur = async () => {
    const trimmed = baseUrl.trim()
    if (trimmed === lastSavedBaseUrl.current) return
    try {
      await persist({ baseUrl: trimmed || null })
      lastSavedBaseUrl.current = trimmed
    } catch (err) {
      toast.error(`Failed to save base URL: ${err}`)
    }
  }

  const handleApiKeyBlur = async () => {
    if (!apiKey) return
    try {
      await agentsApi.setApiKey(agent.id, apiKey)
      setApiKey('')
      void refetchKey()
      toast.success('API key saved')
    } catch (err) {
      toast.error(`Failed to save key: ${err}`)
    }
  }

  const handleAvatarClick = async () => {
    setUploadingAvatar(true)
    try {
      const result = await invoke<MediaPickerResult>('select_media_from_library', {
        mediaTypes: ['image'],
      })
      if (result.cancelled || !result.media) return
      await updateAgent.mutateAsync({
        id: agent.id,
        alias: agent.alias,
        description: agent.description,
        avatar: result.media.localPath,
        baseUrl: agent.baseUrl,
      })
    } catch (err) {
      toast.error(`Failed to update avatar: ${err}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      await duplicateAgent.mutateAsync(agent.id)
      toast.success('Agent duplicated')
      onClose()
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete agent "${agent.alias}"? Sessions belonging to it block deletion.`)) return
    try {
      await deleteAgent.mutateAsync(agent.id)
      onClose()
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="560px" height="660px">
      <SheetHeader>
        <SheetTitle>Edit agent</SheetTitle>
        <SheetDescription>Duplicate to reuse this setup with tweaks.</SheetDescription>
      </SheetHeader>
      <SheetContent className="px-6 py-5">
        <div className="flex gap-4 items-center mb-6">
          <button
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="relative group flex-shrink-0 outline-none rounded-2xl"
            title="Click to change avatar"
          >
            <AgentAvatar agent={agent} size={64} />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Camera size={16} className="text-white" />
              )}
            </div>
          </button>
          <div className="flex-1 min-w-0 space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameBlur} />
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="What this agent is for…"
            rows={2}
            className="w-full bg-muted text-sm rounded-md border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground/60 outline-none resize-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onBlur={handleBaseUrlBlur}
              placeholder="https://api.anthropic.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              API key{' '}
              <span className="text-muted-foreground/70">
                ({hasKey ? 'set — leave empty to keep' : 'not set'})
              </span>
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={handleApiKeyBlur}
              placeholder="sk-…"
            />
          </div>
        </div>

        <AgentConfigSection agent={agent} />

        <div className="mt-8 pt-4 border-t border-border/40 flex items-center gap-2">
          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateAgent.isPending}>
            <Copy size={14} className="mr-1.5" />
            Duplicate
          </Button>
          <Button variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 size={14} className="mr-1.5" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

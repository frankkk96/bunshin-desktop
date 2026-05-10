import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import { IoChatbubbleOutline } from 'react-icons/io5'
import { invoke } from '@tauri-apps/api/core'
import {
  AgentAvatar,
  DeleteButton,
  DetailLayout,
  EditableName,
} from '@/components/common'
import { MacOSButton, MacOSSeparator } from '@/components/ui'
import { useAgents, useDeleteAgent, useUpdateAgent } from '@/hooks/agents'
import { useProvider } from '@/hooks/providers'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Agent } from '@/lib/types'

interface AgentDetailProps {
  agent: Agent
}

interface MediaPickerResult {
  media: { localPath: string; name: string; type: string; mimeType: string } | null
  cancelled: boolean
  error: string | null
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const navigate = useNavigate()
  const { data: provider } = useProvider(agent.providerId)
  const { data: allAgents = [] } = useAgents()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()

  const [description, setDescription] = useState(agent.description ?? '')
  const [savingDesc, setSavingDesc] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [descFocused, setDescFocused] = useState(false)
  const lastSavedDesc = useRef(agent.description ?? '')

  useEffect(() => {
    setDescription(agent.description ?? '')
    lastSavedDesc.current = agent.description ?? ''
  }, [agent.id, agent.description])

  const checkDuplicateName = async (name: string) =>
    allAgents.some((a) => a.id !== agent.id && a.alias === name)

  const handleNameSave = (newName: string) => {
    updateAgent.mutate(
      {
        id: agent.id,
        alias: newName,
        description: agent.description,
        avatar: agent.avatar,
      },
      {
        onSuccess: () => toast.success('Name updated'),
        onError: () => toast.error('Failed to update name'),
      },
    )
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
      })
    } catch (err) {
      toast.error(`Failed to update avatar: ${err}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDescriptionBlur = async () => {
    setDescFocused(false)
    const trimmed = description.trim()
    if (trimmed === lastSavedDesc.current) return
    setSavingDesc(true)
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        alias: agent.alias,
        description: trimmed || null,
        avatar: agent.avatar,
      })
      lastSavedDesc.current = trimmed
    } catch (err) {
      toast.error(`Failed to save description: ${err}`)
    } finally {
      setSavingDesc(false)
    }
  }

  const handleCreateSession = () => {
    navigate(`/sessions?createFor=${encodeURIComponent(agent.id)}`)
  }

  const handleDelete = async () => {
    try {
      await deleteAgent.mutateAsync(agent.id)
      navigate('/agents')
    } catch (err) {
      toast.error(String(err))
    }
  }

  const providerLine = provider
    ? provider.type === 'subscription'
      ? `${provider.name} · Claude subscription`
      : `${provider.name} · ${provider.baseUrl ?? 'Claude-compatible API'}`
    : 'Loading provider…'

  return (
    <DetailLayout>
      <div className="mb-8">
        <div className="flex gap-6 items-center">
          <button
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="relative group flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
            title="Click to change avatar"
          >
            <AgentAvatar agent={agent} size={100} />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </div>
          </button>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <EditableName
              name={agent.alias}
              onSave={handleNameSave}
              checkDuplicate={checkDuplicateName}
            />
            <div className="text-xs text-muted-foreground truncate" title={providerLine}>
              {providerLine}
            </div>
            <div className="mt-3">
              <MacOSButton
                onClick={handleCreateSession}
                className="flex items-center gap-2 px-6 py-2 w-full max-w-xs"
              >
                <IoChatbubbleOutline size={16} />
                Create Session
              </MacOSButton>
            </div>
          </div>
        </div>
      </div>

      <MacOSSeparator className="mb-6 bg-border opacity-30" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </label>
          <span
            className={cn(
              'text-[10px] transition-opacity',
              savingDesc
                ? 'opacity-100 text-muted-foreground'
                : descFocused
                  ? 'opacity-100 text-muted-foreground/60'
                  : 'opacity-0',
            )}
          >
            {savingDesc ? 'Saving…' : 'Click outside to save'}
          </span>
        </div>
        <div
          className={cn(
            'rounded-xl border bg-muted/30 transition-all',
            descFocused
              ? 'border-foreground/30 bg-muted/50 shadow-sm'
              : 'border-transparent hover:bg-muted/40',
          )}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={() => setDescFocused(true)}
            onBlur={handleDescriptionBlur}
            placeholder="What this agent is for…"
            rows={4}
            className="w-full bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none resize-none px-4 py-3"
          />
        </div>
      </div>

      <div className="mt-10">
        <DeleteButton
          text="Delete Agent"
          onDelete={handleDelete}
          confirmMessage="Delete this agent? Sessions belonging to it block deletion."
        />
      </div>
    </DetailLayout>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Camera, Copy, Loader2, Trash2 } from 'lucide-react'
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
import { AgentConfigSection } from './AgentConfigSection'
import { PERMISSION_MODES, ProviderGuideLink } from './AgentCreationModal'
import {
  useAgentApiKey,
  useDeleteAgent,
  useDuplicateAgent,
  useUpdateAgent,
} from '@/hooks/agents'
import { agentsApi } from '@/lib/tauri/service/agents'
import { pickDirectory } from '@/lib/tauri/service/sessions'
import { useT } from '@/lib/i18n'
import { toast } from '@/lib/core/utils/toast'
import type { Agent, PermissionMode } from '@/lib/types'

interface MediaPickerResult {
  media: { localPath: string; name: string; type: string; mimeType: string } | null
  cancelled: boolean
  error: string | null
}

const inputCls =
  'w-full h-8 px-3 text-sm rounded-md border bg-muted text-foreground placeholder:text-muted-foreground/60 outline-none border-border focus:ring-1 focus:ring-ring'

export function AgentEditor({
  agent,
  onClose,
  onDeleted,
}: {
  agent: Agent
  onClose: () => void
  onDeleted?: () => void
}) {
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()
  const duplicateAgent = useDuplicateAgent()
  const t = useT()
  const { data: storedKey, refetch: refetchKey } = useAgentApiKey(agent.id)

  const [name, setName] = useState(agent.alias)
  const [cwd, setCwd] = useState(agent.cwd)
  const [baseUrl, setBaseUrl] = useState(agent.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(agent.config?.model ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const lastSavedName = useRef(agent.alias)
  const lastSavedBaseUrl = useRef(agent.baseUrl ?? '')
  const lastSavedKey = useRef('')
  const lastSavedModel = useRef(agent.config?.model ?? '')

  useEffect(() => {
    setName(agent.alias)
    setCwd(agent.cwd)
    setBaseUrl(agent.baseUrl ?? '')
    setModel(agent.config?.model ?? '')
    lastSavedName.current = agent.alias
    lastSavedBaseUrl.current = agent.baseUrl ?? ''
    lastSavedModel.current = agent.config?.model ?? ''
  }, [agent.id])

  useEffect(() => {
    const k = storedKey ?? ''
    setApiKey(k)
    lastSavedKey.current = k
  }, [agent.id, storedKey])

  // Every update must carry cwd + permissionMode (they're required by the API).
  const persist = (
    patch: Partial<{
      alias: string
      baseUrl: string | null
      cwd: string
      permissionMode: PermissionMode
    }>,
  ) =>
    updateAgent.mutateAsync({
      id: agent.id,
      alias: patch.alias ?? agent.alias,
      description: agent.description,
      avatar: agent.avatar,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl : agent.baseUrl,
      cwd: patch.cwd ?? agent.cwd,
      permissionMode: patch.permissionMode ?? agent.permissionMode,
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

  const handleBaseUrlBlur = async () => {
    const trimmed = baseUrl.trim()
    if (!trimmed) {
      setBaseUrl(lastSavedBaseUrl.current)
      return
    }
    if (trimmed === lastSavedBaseUrl.current) return
    try {
      await persist({ baseUrl: trimmed })
      lastSavedBaseUrl.current = trimmed
    } catch (err) {
      toast.error(`Failed to save base URL: ${err}`)
    }
  }

  const handlePickDir = async () => {
    const picked = await pickDirectory('Pick working directory')
    if (!picked || picked === agent.cwd) return
    try {
      await persist({ cwd: picked })
      setCwd(picked)
    } catch (err) {
      toast.error(`Failed to set directory: ${err}`)
    }
  }

  const handlePermissionChange = async (mode: PermissionMode) => {
    try {
      await persist({ permissionMode: mode })
    } catch (err) {
      toast.error(`Failed to set permission mode: ${err}`)
    }
  }

  const handleApiKeyBlur = async () => {
    const trimmed = apiKey.trim()
    if (trimmed === lastSavedKey.current) return
    try {
      await agentsApi.setApiKey(agent.id, trimmed)
      lastSavedKey.current = trimmed
      void refetchKey()
    } catch (err) {
      toast.error(`Failed to save key: ${err}`)
    }
  }

  const handleModelBlur = async () => {
    const trimmed = model.trim()
    if (trimmed === lastSavedModel.current) return
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        alias: agent.alias,
        description: agent.description,
        avatar: agent.avatar,
        baseUrl: agent.baseUrl,
        cwd: agent.cwd,
        permissionMode: agent.permissionMode,
        config: { ...agent.config, model: trimmed || undefined },
      })
      lastSavedModel.current = trimmed
    } catch (err) {
      toast.error(`Failed to save model: ${err}`)
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
        cwd: agent.cwd,
        permissionMode: agent.permissionMode,
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
      toast.success(t('agent.duplicated'))
      onClose()
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('agent.deleteConfirm'))) return
    try {
      await deleteAgent.mutateAsync(agent.id)
      onDeleted?.()
      onClose()
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="560px" height="680px">
      <SheetHeader>
        <SheetTitle>{t('agent.edit')}</SheetTitle>
        <SheetDescription>{t('agent.editDesc')}</SheetDescription>
        <div className="mt-1.5">
          <ProviderGuideLink t={t} />
        </div>
      </SheetHeader>
      <SheetContent className="px-6 py-5">
        <div className="flex gap-4 items-center mb-6">
          <button
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="relative group flex-shrink-0 outline-none rounded-2xl"
            title={t('agent.changeAvatar')}
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
            <Label>{t('agent.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameBlur} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('agent.cwd')}</Label>
            <div className="flex gap-2">
              <Input value={cwd} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={handlePickDir} className="flex-shrink-0">
                {t('common.browse')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('agent.baseUrl')}</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onBlur={handleBaseUrlBlur}
              placeholder="https://api.anthropic.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('agent.apiKey')}</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={handleApiKeyBlur}
              placeholder="sk-…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('agent.model')}</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={handleModelBlur}
              placeholder="claude-opus-4-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('agent.permission')}</Label>
            <select
              value={agent.permissionMode}
              onChange={(e) => handlePermissionChange(e.target.value as PermissionMode)}
              className={inputCls}
            >
              {PERMISSION_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(m.key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AgentConfigSection agent={agent} />

        <div className="mt-8 pt-4 border-t border-border/40 flex items-center gap-2">
          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateAgent.isPending}>
            <Copy size={14} className="mr-1.5" />
            {t('common.duplicate')}
          </Button>
          <Button variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 size={14} className="mr-1.5" />
            {t('common.delete')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

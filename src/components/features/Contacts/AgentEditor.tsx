import { useEffect, useRef, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { AgentConfigSection } from './AgentConfigSection'
import { DirPickerButton, ProviderGuideLink } from './AgentCreationModal'
import { FieldRow, SectionHeader } from './FieldRow'
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
    <Sheet isOpen onClose={onClose} maxWidth="560px" height="520px">
      <SheetHeader>
        <SheetTitle>{t('agent.edit')}</SheetTitle>
        <SheetDescription>{t('agent.editDesc')}</SheetDescription>
      </SheetHeader>
      <SheetContent className="px-6 py-5 space-y-6">
        {/* Basics: name · workspace */}
        <div>
          <SectionHeader title={t('agent.secBasics')} />
          <div className="space-y-3">
            <FieldRow label={t('agent.name')}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
              />
            </FieldRow>
            <FieldRow label={t('agent.cwd')}>
              <div className="flex gap-2">
                <Input value={cwd} readOnly className="font-mono text-xs" />
                <DirPickerButton onClick={handlePickDir} title={t('common.browse')} />
              </div>
            </FieldRow>
          </div>
        </div>

        {/* Provider: base URL · API key · model */}
        <div>
          <SectionHeader title={t('agent.secProvider')} right={<ProviderGuideLink t={t} />} />
          <div className="space-y-3">
            <FieldRow label={t('agent.baseUrl')}>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                onBlur={handleBaseUrlBlur}
                placeholder="https://api.anthropic.com"
              />
            </FieldRow>
            <FieldRow label={t('agent.apiKey')}>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={handleApiKeyBlur}
                placeholder="sk-…"
              />
            </FieldRow>
            <FieldRow label={t('agent.model')}>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={handleModelBlur}
                placeholder="claude-opus-4-8"
              />
            </FieldRow>
          </div>
        </div>

        <AgentConfigSection agent={agent} />

        <div className="pt-4 border-t border-border/40 flex items-center gap-2">
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

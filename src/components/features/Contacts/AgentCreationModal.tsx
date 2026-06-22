import { useState } from 'react'
import { ChevronRight, ExternalLink, FolderOpen } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { FieldRow, SectionHeader } from './FieldRow'
import { useCreateAgent } from '@/hooks/agents'
import { pickDirectory } from '@/lib/tauri/service/sessions'
import { useT, type TKey } from '@/lib/i18n'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Agent, PermissionMode } from '@/lib/types'

/** A compact icon button to open the directory picker. */
export function DirPickerButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <FolderOpen size={15} />
    </button>
  )
}

export const PROVIDER_GUIDE_URL = 'https://bunshin.app/guide/providers'

/** A subtle "how to configure a provider" external link. */
export function ProviderGuideLink({ t }: { t: (k: TKey) => string }) {
  return (
    <button
      type="button"
      onClick={() => void openUrl(PROVIDER_GUIDE_URL)}
      className="inline-flex items-center gap-1 text-xs text-interactive hover:underline underline-offset-2"
    >
      {t('agent.setupGuide')}
      <ExternalLink size={11} />
    </button>
  )
}

export const PERMISSION_MODES: { value: PermissionMode; key: TKey }[] = [
  { value: 'default', key: 'perm.default' },
  { value: 'acceptEdits', key: 'perm.acceptEdits' },
  { value: 'plan', key: 'perm.plan' },
  { value: 'bypassPermissions', key: 'perm.bypass' },
  { value: 'dontAsk', key: 'perm.dontAsk' },
]

const inputCls =
  'w-full h-8 px-3 text-sm rounded-md border bg-transparent text-foreground placeholder:text-muted-foreground/60 outline-none border-border focus:ring-1 focus:ring-ring'

interface AgentCreationModalProps {
  onClose: () => void
  onCreated: (agent: Agent) => void
}

export function AgentCreationModal({ onClose, onCreated }: AgentCreationModalProps) {
  const createAgent = useCreateAgent()
  const t = useT()

  const [alias, setAlias] = useState('')
  const [cwd, setCwd] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handlePickDir = async () => {
    const picked = await pickDirectory('Pick working directory')
    if (picked) setCwd(picked)
  }

  const handleCreate = async () => {
    if (!alias.trim() || !cwd.trim() || !baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      toast.error(t('agent.allRequired'))
      return
    }
    try {
      const agent = await createAgent.mutateAsync({
        alias: alias.trim(),
        description: null,
        avatar: null,
        baseUrl: baseUrl.trim(),
        cwd: cwd.trim(),
        permissionMode,
        apiKey,
        config: { model: model.trim() },
      })
      onCreated(agent)
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="480px" height="auto">
      <SheetHeader>
        <SheetTitle>{t('agent.new')}</SheetTitle>
        <SheetDescription>{t('agent.newDesc')}</SheetDescription>
      </SheetHeader>
      <SheetContent className="px-6 py-5 space-y-6">
        {/* Basics: name · workspace */}
        <div>
          <SectionHeader title={t('agent.secBasics')} />
          <div className="space-y-3">
            <FieldRow label={t('agent.name')}>
              <Input
                autoFocus
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder={t('agent.namePlaceholder')}
              />
            </FieldRow>
            <FieldRow label={t('agent.cwd')}>
              <div className="flex gap-2">
                <Input
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="/path/to/project"
                  className="font-mono text-xs"
                />
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
              placeholder="https://api.anthropic.com"
            />
          </FieldRow>
          <FieldRow label={t('agent.apiKey')}>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" />
          </FieldRow>
          <FieldRow label={t('agent.model')}>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="claude-opus-4-8"
            />
          </FieldRow>
          </div>
        </div>

        {/* Advanced: permission mode */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              size={14}
              className={cn('transition-transform', showAdvanced && 'rotate-90')}
            />
            {t('cfg.advanced')}
          </button>

          {showAdvanced && (
            <div className="pt-3">
              <FieldRow label={t('agent.permission')}>
                <select
                  value={permissionMode}
                  onChange={(e) => setPermissionMode(e.target.value as PermissionMode)}
                  className={inputCls}
                >
                  {PERMISSION_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {t(m.key)}
                    </option>
                  ))}
                </select>
              </FieldRow>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={createAgent.isPending}>
            {createAgent.isPending ? t('common.creating') : t('common.create')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

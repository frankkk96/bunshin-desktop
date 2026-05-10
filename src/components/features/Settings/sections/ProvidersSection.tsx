import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import {
  MacOSButton,
  MacOSInput,
  MacOSLabel,
  MacOSSelect,
  MacOSSelectContent,
  MacOSSelectItem,
  MacOSSelectTrigger,
  MacOSSelectValue,
} from '@/components/ui'
import { SettingSection } from '../components/SettingSection'
import {
  useCreateProvider,
  useDeleteProvider,
  useHasApiKey,
  useProviders,
  useUpdateProvider,
} from '@/hooks/providers'
import { toast } from '@/lib/core/utils/toast'
import type { Provider, ProviderType } from '@/lib/types'

export function ProvidersSection() {
  const { data: providers = [] } = useProviders()
  const [editing, setEditing] = useState<Provider | 'new' | null>(null)

  return (
    <SettingSection title="Providers">
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Each agent talks to Claude Code through one of these providers. Subscription reuses your
          local <code>claude auth login</code>; API providers inject{' '}
          <code>ANTHROPIC_BASE_URL</code> / <code>ANTHROPIC_API_KEY</code> into the subprocess.
        </p>

        {providers.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No providers yet — add one to start creating agents.
          </p>
        )}

        {providers.map((p) => (
          <ProviderRow key={p.id} provider={p} onEdit={() => setEditing(p)} />
        ))}

        <MacOSButton size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus size={14} className="mr-1" />
          Add provider
        </MacOSButton>
      </div>

      {editing && (
        <ProviderEditor
          provider={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </SettingSection>
  )
}

function ProviderRow({ provider, onEdit }: { provider: Provider; onEdit: () => void }) {
  const deleteProvider = useDeleteProvider()
  const { data: hasKey } = useHasApiKey(provider.type === 'api' ? provider.id : undefined)

  const handleDelete = async () => {
    if (!confirm(`Delete provider "${provider.name}"?`)) return
    try {
      await deleteProvider.mutateAsync(provider.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{provider.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {provider.type === 'subscription' ? 'Claude subscription (system login)' : provider.baseUrl}
          {provider.type === 'api' && (hasKey ? ' · key set' : ' · no key')}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <MacOSButton variant="icon" onClick={onEdit}>
          <Pencil size={14} />
        </MacOSButton>
        <MacOSButton variant="icon" onClick={handleDelete}>
          <Trash2 size={14} />
        </MacOSButton>
      </div>
    </div>
  )
}

function ProviderEditor({
  provider,
  onClose,
}: {
  provider: Provider | null
  onClose: () => void
}) {
  const isNew = provider === null
  const [name, setName] = useState(provider?.name ?? '')
  const [type, setType] = useState<ProviderType>(provider?.type ?? 'subscription')
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')

  const create = useCreateProvider()
  const update = useUpdateProvider()

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      if (isNew) {
        await create.mutateAsync({
          name: name.trim(),
          type,
          baseUrl: type === 'api' ? baseUrl.trim() || null : null,
          apiKey: type === 'api' ? apiKey : undefined,
        })
      } else {
        await update.mutateAsync({
          id: provider!.id,
          name: name.trim(),
          baseUrl: type === 'api' ? baseUrl.trim() || null : null,
          apiKey: type === 'api' && apiKey ? apiKey : undefined,
        })
      }
      onClose()
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-3">
      <h4 className="text-sm font-medium">{isNew ? 'New provider' : `Edit ${provider!.name}`}</h4>
      <div>
        <MacOSLabel>Name</MacOSLabel>
        <MacOSInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <MacOSLabel>Type</MacOSLabel>
        {isNew ? (
          <MacOSSelect value={type} onValueChange={(v) => setType(v as ProviderType)}>
            <MacOSSelectTrigger>
              <MacOSSelectValue />
            </MacOSSelectTrigger>
            <MacOSSelectContent>
              <MacOSSelectItem value="subscription">Claude subscription</MacOSSelectItem>
              <MacOSSelectItem value="api">Claude-compatible API</MacOSSelectItem>
            </MacOSSelectContent>
          </MacOSSelect>
        ) : (
          <MacOSInput value={type} disabled />
        )}
      </div>
      {type === 'api' && (
        <>
          <div>
            <MacOSLabel>Base URL</MacOSLabel>
            <MacOSInput
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.anthropic.com"
            />
          </div>
          <div>
            <MacOSLabel>API key {!isNew && '(leave empty to keep current)'}</MacOSLabel>
            <MacOSInput
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </>
      )}
      {type === 'subscription' && (
        <p className="text-xs text-muted-foreground">
          Make sure you've run <code>claude auth login</code> in your terminal first.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <MacOSButton variant="ghost" onClick={onClose}>
          Cancel
        </MacOSButton>
        <MacOSButton onClick={handleSubmit}>{isNew ? 'Create' : 'Save'}</MacOSButton>
      </div>
    </div>
  )
}

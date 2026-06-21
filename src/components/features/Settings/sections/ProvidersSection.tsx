import { useEffect, useState } from 'react'
import { Cloud, KeyRound, LogIn, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { SettingSection } from '../components/SettingSection'
import {
  useCreateProvider,
  useDeleteProvider,
  useHasApiKey,
  useProviders,
  useSignInProvider,
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
        {providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <Cloud className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No providers yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Add one to start creating agents.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} onEdit={() => setEditing(p)} />
            ))}
          </div>
        )}

        <MacOSButton
          size="sm"
          variant="outline"
          onClick={() => setEditing('new')}
          className="w-full justify-center"
        >
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

function ProviderCard({ provider, onEdit }: { provider: Provider; onEdit: () => void }) {
  const deleteProvider = useDeleteProvider()
  const { data: hasKey } = useHasApiKey(provider.type === 'api' ? provider.id : undefined)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete provider "${provider.name}"?`)) return
    try {
      await deleteProvider.mutateAsync(provider.id)
    } catch (err) {
      toast.error(String(err))
    }
  }

  const subtitle =
    provider.type === 'subscription'
      ? 'Isolated Claude subscription profile'
      : provider.baseUrl ?? 'Anthropic API endpoint'

  return (
    <div className="group rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/60 text-muted-foreground">
          {provider.type === 'subscription' ? <Cloud size={16} /> : <KeyRound size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{provider.name}</span>
            <TypeBadge type={provider.type} />
            {provider.type === 'api' && (
              <KeyBadge present={!!hasKey} />
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5" title={subtitle}>
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

function TypeBadge({ type }: { type: ProviderType }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide bg-muted text-muted-foreground">
      {type === 'subscription' ? 'Sub' : 'API'}
    </span>
  )
}

function KeyBadge({ present }: { present: boolean }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
      {present ? 'key set' : 'no key'}
    </span>
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
  const signIn = useSignInProvider()

  // Reset local state if the user opens a different provider for editing.
  useEffect(() => {
    setName(provider?.name ?? '')
    setType(provider?.type ?? 'subscription')
    setBaseUrl(provider?.baseUrl ?? '')
    setApiKey('')
  }, [provider?.id])

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

  const typeHint =
    type === 'subscription'
      ? 'Each subscription provider has its own isolated Claude profile — sign in once after creating.'
      : 'Custom base URL and API key (e.g. Anthropic, OpenRouter, a self-hosted proxy).'

  const handleSignIn = async () => {
    if (!provider) return
    try {
      await signIn.mutateAsync(provider.id)
      toast.success('Terminal opened — complete the login there.')
    } catch (err) {
      toast.error(String(err))
    }
  }

  return (
    <MacOSSheet isOpen onClose={onClose} maxWidth="480px" height="auto">
      <MacOSSheetHeader>
        <MacOSSheetTitle>{isNew ? 'New provider' : `Edit ${provider!.name}`}</MacOSSheetTitle>
        <MacOSSheetDescription>
          {isNew
            ? 'Type is fixed after creation. Subscription providers need a one-time sign-in afterwards.'
            : 'Type is fixed after creation.'}
        </MacOSSheetDescription>
      </MacOSSheetHeader>
      <MacOSSheetContent className="px-6 py-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
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
            <p className="text-xs text-muted-foreground">{typeHint}</p>
          </div>
          <div className="space-y-1.5">
            <MacOSLabel>Name</MacOSLabel>
            <MacOSInput
              autoFocus={isNew}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anthropic"
            />
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
                <MacOSLabel>
                  API key {!isNew && <span className="text-muted-foreground/70">(leave empty to keep)</span>}
                </MacOSLabel>
                <MacOSInput
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                />
              </div>
            </>
          )}
          {!isNew && type === 'subscription' && (
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
              <div className="text-xs text-muted-foreground leading-relaxed">
                Sign in to this provider's isolated profile. Opens a terminal that
                runs <code className="px-1 py-0.5 rounded bg-muted text-[10px]">claude /login</code>
                {' '}with the right <code className="px-1 py-0.5 rounded bg-muted text-[10px]">CLAUDE_CONFIG_DIR</code>.
              </div>
              <MacOSButton
                size="sm"
                variant="outline"
                onClick={handleSignIn}
                disabled={signIn.isPending}
                className="w-full justify-center"
              >
                <LogIn size={13} className="mr-1.5" />
                {signIn.isPending ? 'Opening…' : 'Sign in'}
              </MacOSButton>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <MacOSButton variant="ghost" onClick={onClose}>
            Cancel
          </MacOSButton>
          <MacOSButton onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending)
              ? 'Saving…'
              : isNew
                ? 'Create'
                : 'Save'}
          </MacOSButton>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useAgents } from '@/hooks/agents'
import { useStartSession } from '@/hooks/sessions'
import { pickDirectory } from '@/lib/tauri/service/sessions'
import { toast } from '@/lib/core/utils/toast'
import { openSettingsWindow } from '@/components/features/Settings/SettingsWindow'
import type { PermissionMode, Session } from '@/lib/types'

interface StartSessionModalProps {
  onClose: () => void
  onStarted: (session: Session) => void
  defaultAgentId?: string
}

const PERMISSION_MODES: { value: PermissionMode; label: string; hint: string }[] = [
  { value: 'default', label: 'Default', hint: 'Ask before every potentially destructive action' },
  { value: 'acceptEdits', label: 'Accept edits', hint: 'Auto-approve file edits, still ask for risky ones' },
  { value: 'plan', label: 'Plan only', hint: 'No tools — just produce a plan you can approve' },
  { value: 'bypassPermissions', label: 'Bypass permissions', hint: 'No prompts — only for sandboxed dirs' },
  { value: 'dontAsk', label: "Don't ask", hint: 'Like bypass but slightly different (claude CLI semantics)' },
]

export function StartSessionModal({
  onClose,
  onStarted,
  defaultAgentId,
}: StartSessionModalProps) {
  const navigate = useNavigate()
  const agentsQuery = useAgents()
  const agents = agentsQuery.data ?? []
  const startSession = useStartSession()

  const [agentId, setAgentId] = useState<string | undefined>(defaultAgentId ?? agents[0]?.id)
  const [cwd, setCwd] = useState('')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [name, setName] = useState('')

  // Refresh agents whenever the modal opens — prevents the picker from showing
  // stale data when the user just created an agent in another window.
  useEffect(() => {
    void agentsQuery.refetch()
    // Agents are managed in the separate Settings window; refetch when the user
    // comes back so a freshly added agent shows up in the picker.
    const onFocus = () => void agentsQuery.refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!agentId) {
      setAgentId(defaultAgentId ?? agents[0]?.id)
    }
  }, [agents, agentId, defaultAgentId])

  const handlePickDir = async () => {
    const picked = await pickDirectory('Pick working directory')
    if (picked) setCwd(picked)
  }

  const handleStart = async () => {
    if (!agentId) {
      toast.error('Pick an agent')
      return
    }
    if (!cwd.trim()) {
      toast.error('Pick a working directory')
      return
    }
    try {
      const session = await startSession.mutateAsync({
        agentId,
        cwd: cwd.trim(),
        permissionMode,
        name: name.trim() || null,
      })
      onStarted(session)
    } catch (err) {
      const msg = String(err)
      const dup = msg.match(/DUPLICATE_SESSION:([\w-]+)/)
      if (dup) {
        toast.info('A session for this agent and folder already exists — opening it.')
        onClose()
        navigate(`/sessions/${dup[1]}`)
        return
      }
      toast.error(msg)
    }
  }

  return (
    <Sheet isOpen onClose={onClose} maxWidth="520px" height="auto">
      <SheetHeader>
        <SheetTitle>Create Session</SheetTitle>
        <SheetDescription>
          Spawns a Claude Code subprocess in the chosen working directory.
        </SheetDescription>
      </SheetHeader>
      <SheetContent className="px-6 py-5">
        <div className="space-y-4">
          <Field label="Agent">
            {agents.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5">
                <span className="text-sm text-muted-foreground">No agents yet.</span>
                <Button variant="outline" onClick={() => openSettingsWindow('agents')}>
                  Set up in Settings
                </Button>
              </div>
            ) : (
              <Select value={agentId} onValueChange={(v) => setAgentId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Working directory">
            <div className="flex gap-2">
              <Input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/path/to/project"
              />
              <Button variant="outline" onClick={handlePickDir}>
                Browse…
              </Button>
            </div>
          </Field>

          <Field
            label="Permission mode"
            hint={PERMISSION_MODES.find((m) => m.value === permissionMode)?.hint}
          >
            <Select
              value={permissionMode}
              onValueChange={(v) => setPermissionMode(v as PermissionMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Display name (optional)">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. refactor-foo"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={startSession.isPending}>
            {startSession.isPending ? 'Creating…' : 'Create session'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

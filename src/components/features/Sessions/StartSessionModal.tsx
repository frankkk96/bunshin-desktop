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
import { useAgents } from '@/hooks/agents'
import { useStartSession } from '@/hooks/sessions'
import { pickDirectory } from '@/lib/tauri/service/sessions'
import { toast } from '@/lib/core/utils/toast'
import type { PermissionMode, Session } from '@/lib/types'

interface StartSessionModalProps {
  onClose: () => void
  onStarted: (session: Session) => void
}

const PERMISSION_MODES: { value: PermissionMode; label: string; hint: string }[] = [
  { value: 'default', label: 'Default', hint: 'Ask before every potentially destructive action' },
  { value: 'acceptEdits', label: 'Accept edits', hint: 'Auto-approve file edits, still ask for risky ones' },
  { value: 'plan', label: 'Plan only', hint: 'No tools — just produce a plan you can approve' },
  { value: 'bypassPermissions', label: 'Bypass permissions', hint: 'No prompts — only for sandboxed dirs' },
  { value: 'dontAsk', label: "Don't ask", hint: 'Like bypass but slightly different (claude CLI semantics)' },
]

export function StartSessionModal({ onClose, onStarted }: StartSessionModalProps) {
  const { data: agents = [] } = useAgents()
  const startSession = useStartSession()

  const [agentId, setAgentId] = useState<string | undefined>(agents[0]?.id)
  const [cwd, setCwd] = useState('')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [name, setName] = useState('')

  useEffect(() => {
    if (!agentId && agents[0]) setAgentId(agents[0].id)
  }, [agents, agentId])

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
      toast.error(String(err))
    }
  }

  return (
    <MacOSSheet isOpen onClose={onClose} maxWidth="520px" height="auto">
      <MacOSSheetHeader>
        <MacOSSheetTitle>Start Session</MacOSSheetTitle>
        <MacOSSheetDescription>
          Spawns a Claude Code subprocess in the chosen working directory.
        </MacOSSheetDescription>
      </MacOSSheetHeader>
      <MacOSSheetContent>
        <div className="space-y-3">
          <div>
            <MacOSLabel>Agent</MacOSLabel>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No agents yet. Create one in the Contacts tab first.
              </p>
            ) : (
              <MacOSSelect value={agentId} onValueChange={(v) => setAgentId(v)}>
                <MacOSSelectTrigger>
                  <MacOSSelectValue placeholder="Pick an agent" />
                </MacOSSelectTrigger>
                <MacOSSelectContent>
                  {agents.map((a) => (
                    <MacOSSelectItem key={a.id} value={a.id}>
                      {a.alias}
                    </MacOSSelectItem>
                  ))}
                </MacOSSelectContent>
              </MacOSSelect>
            )}
          </div>

          <div>
            <MacOSLabel>Working directory</MacOSLabel>
            <div className="flex gap-2">
              <MacOSInput
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/path/to/project"
              />
              <MacOSButton variant="outline" onClick={handlePickDir}>
                Browse…
              </MacOSButton>
            </div>
          </div>

          <div>
            <MacOSLabel>Permission mode</MacOSLabel>
            <MacOSSelect
              value={permissionMode}
              onValueChange={(v) => setPermissionMode(v as PermissionMode)}
            >
              <MacOSSelectTrigger>
                <MacOSSelectValue />
              </MacOSSelectTrigger>
              <MacOSSelectContent>
                {PERMISSION_MODES.map((m) => (
                  <MacOSSelectItem key={m.value} value={m.value}>
                    {m.label}
                  </MacOSSelectItem>
                ))}
              </MacOSSelectContent>
            </MacOSSelect>
            <p className="text-xs text-muted-foreground mt-1">
              {PERMISSION_MODES.find((m) => m.value === permissionMode)?.hint}
            </p>
          </div>

          <div>
            <MacOSLabel>Display name (optional)</MacOSLabel>
            <MacOSInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. refactor-foo"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <MacOSButton variant="ghost" onClick={onClose}>
            Cancel
          </MacOSButton>
          <MacOSButton onClick={handleStart} disabled={startSession.isPending}>
            {startSession.isPending ? 'Starting…' : 'Start session'}
          </MacOSButton>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

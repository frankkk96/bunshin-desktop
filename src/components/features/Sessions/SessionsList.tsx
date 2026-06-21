import { AlertCircle, CheckCircle2, CircleDashed, Loader2, Plus } from 'lucide-react'
import { AgentAvatar } from '@/components/common'
import { Button } from '@/components/ui'
import { useAgents } from '@/hooks/agents'
import { useRunningSessions } from '@/hooks/sessions'
import { cn } from '@/lib/ui/utils'
import type { Session } from '@/lib/types'

interface SessionsListProps {
  sessions: Session[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  onCreate?: () => void
  /** Whether any session exists at all (vs the list being empty due to search). */
  hasAnySession?: boolean
}

export function SessionsList({
  sessions,
  selectedId,
  onSelect,
  onCreate,
  hasAnySession,
}: SessionsListProps) {
  const { data: agents = [] } = useAgents()
  const { data: running = [] } = useRunningSessions()

  if (sessions.length === 0) {
    // Distinguish "no sessions at all" (offer a create CTA) from "search hid
    // everything" (just say so).
    if (hasAnySession) {
      return (
        <div className="px-4 py-6 text-xs text-muted-foreground text-center">
          No matching sessions.
        </div>
      )
    }
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          No sessions yet. Start one to begin chatting with an agent.
        </p>
        {onCreate && (
          <Button onClick={onCreate} className="flex items-center gap-1.5">
            <Plus size={14} />
            Create Session
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sessions.map((s) => {
        const agent = agents.find((a) => a.id === s.agentId)
        const status = running.find((r) => r.sessionId === s.id)?.status
        const isSelected = selectedId === s.id
        const title = s.name || agent?.alias || 'Session'

        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 cursor-default',
              isSelected ? 'bg-accent' : 'hover:bg-muted/40',
            )}
          >
            <div className="flex items-center gap-2.5">
              <AgentAvatar agent={agent} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {title}
                  </span>
                  <StatusIcon status={status} />
                </div>
                <div
                  className="text-[11px] text-muted-foreground truncate"
                  title={s.cwd}
                >
                  {s.cwd}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusIcon({ status }: { status?: 'running' | 'stopped' | 'crashed' }) {
  if (status === 'crashed') {
    return <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
  }
  if (!status) {
    return <Loader2 size={13} className="text-muted-foreground animate-spin flex-shrink-0" />
  }
  if (status === 'stopped') {
    return <CircleDashed size={13} className="text-muted-foreground/70 flex-shrink-0" />
  }
  return <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
}

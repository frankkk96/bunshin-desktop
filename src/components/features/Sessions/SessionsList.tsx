import { cn } from '@/lib/ui/utils'
import { useAgents } from '@/hooks/agents'
import { useRunningSessions } from '@/hooks/sessions'
import type { Session } from '@/lib/types'

interface SessionsListProps {
  sessions: Session[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}

export function SessionsList({ sessions, selectedId, onSelect }: SessionsListProps) {
  const { data: agents = [] } = useAgents()
  const { data: running = [] } = useRunningSessions()

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        No sessions yet. Click + to start one.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sessions.map((s) => {
        const agent = agents.find((a) => a.id === s.agentId)
        const status = running.find((r) => r.sessionId === s.id)?.status
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'flex flex-col items-start px-3 py-2 hover:bg-muted/40 text-left transition-colors',
              selectedId === s.id && 'bg-muted',
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <StatusDot status={status} />
              <span className="text-sm font-medium truncate flex-1">
                {s.name || agent?.alias || 'Session'}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate w-full mt-0.5">
              {agent?.alias ?? 'Unknown agent'} · {s.cwd}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StatusDot({ status }: { status?: 'running' | 'stopped' | 'crashed' }) {
  const color =
    status === 'running'
      ? 'bg-emerald-500'
      : status === 'crashed'
        ? 'bg-red-500'
        : 'bg-gray-400/60'
  return <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
}

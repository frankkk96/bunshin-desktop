import { AgentAvatar } from '@/components/common'
import { useAgents } from '@/hooks/agents'
import { useRunningSessions } from '@/hooks/sessions'
import { cn } from '@/lib/ui/utils'
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
      <div className="px-4 py-6 text-xs text-muted-foreground">
        No sessions yet — click <kbd className="px-1 rounded bg-muted">+</kbd> to start one.
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
                  <span className="text-sm font-semibold text-foreground truncate flex-1">
                    {title}
                  </span>
                  <StatusDot status={status} />
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

function StatusDot({ status }: { status?: 'running' | 'stopped' | 'crashed' }) {
  const color =
    status === 'running'
      ? 'bg-emerald-500'
      : status === 'crashed'
        ? 'bg-red-500'
        : 'bg-gray-400/60'
  const title =
    status === 'running' ? 'Running' : status === 'crashed' ? 'Crashed' : 'Idle'
  return (
    <span
      title={title}
      className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', color)}
    />
  )
}

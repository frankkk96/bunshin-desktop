import { cn } from '@/lib/ui/utils'
import type { Agent } from '@/lib/types'

interface ContactsListProps {
  agents: Agent[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}

export function ContactsList({ agents, selectedId, onSelect }: ContactsListProps) {
  if (agents.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        No agents yet. Create one with the + button above.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {agents.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a.id)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors',
            selectedId === a.id && 'bg-muted',
          )}
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-sm">
            {a.avatar ?? a.alias.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{a.alias}</div>
            {a.description && (
              <div className="text-xs text-muted-foreground truncate">{a.description}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

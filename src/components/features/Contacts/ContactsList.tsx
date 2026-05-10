import { AgentAvatar } from '@/components/common'
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
      <div className="px-4 py-6 text-xs text-muted-foreground">
        No agents yet — click <kbd className="px-1 rounded bg-muted">+</kbd> to create one.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {agents.map((agent) => {
        const isSelected = selectedId === agent.id
        return (
          <div
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={cn(
              'w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 text-left gap-2.5 flex items-center cursor-default',
              isSelected ? 'bg-accent' : 'hover:bg-muted/40',
            )}
          >
            <AgentAvatar agent={agent} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-foreground mb-[1px]">
                {agent.alias}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {agent.description || 'No description'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

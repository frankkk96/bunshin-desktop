import { Pencil, Plus } from 'lucide-react'
import { AgentAvatar } from '@/components/common'
import { Button } from '@/components/ui'
import { cn } from '@/lib/ui/utils'
import { useT } from '@/lib/i18n'
import type { Agent } from '@/lib/types'

interface AgentsListProps {
  agents: Agent[]
  selectedAgentId: string | undefined
  runningAgentIds: Set<string>
  onSelect: (agentId: string) => void
  onEdit: (agent: Agent) => void
  onCreate?: () => void
  /** Whether any agent exists (vs the list being empty due to search). */
  hasAnyAgent?: boolean
  /** Narrow rail: render avatars only. */
  collapsed?: boolean
}

export function AgentsList({
  agents,
  selectedAgentId,
  runningAgentIds,
  onSelect,
  onEdit,
  onCreate,
  hasAnyAgent,
  collapsed,
}: AgentsListProps) {
  const t = useT()

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-2">
        {agents.map((a) => {
          const isSelected = selectedAgentId === a.id
          const running = runningAgentIds.has(a.id)
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              title={a.alias}
              className={cn(
                'relative p-1 rounded-lg transition-colors',
                isSelected ? 'bg-accent' : 'hover:bg-muted/40',
              )}
            >
              <AgentAvatar agent={a} size={36} />
              {running && (
                <span
                  title={t('agent.running')}
                  className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-secondary"
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (agents.length === 0) {
    if (hasAnyAgent) {
      return (
        <div className="px-4 py-6 text-xs text-muted-foreground text-center">{t('agent.noMatch')}</div>
      )
    }
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{t('agent.noneChat')}</p>
        {onCreate && (
          <Button onClick={onCreate} className="flex items-center gap-1.5">
            <Plus size={14} />
            {t('agent.newAgent')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {agents.map((a) => {
        const isSelected = selectedAgentId === a.id
        const running = runningAgentIds.has(a.id)
        return (
          <div
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              'group w-[calc(100%-24px)] py-2 px-1.5 rounded-md my-0.5 mx-3 cursor-default',
              isSelected ? 'bg-accent' : 'hover:bg-muted/40',
            )}
          >
            <div className="flex items-center gap-2.5">
              <AgentAvatar agent={a} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{a.alias}</span>
                  {running && (
                    <span
                      title={t('agent.running')}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                    />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate font-mono" title={a.cwd}>
                  {a.cwd}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(a)
                }}
                title={t('agent.editTooltip')}
                className="flex-shrink-0 p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

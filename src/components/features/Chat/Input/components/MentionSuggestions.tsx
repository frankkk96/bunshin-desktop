import { Avatar } from '@/components/common'
import type { Agent } from '@/lib/core/agent/types'
import { Users } from 'lucide-react'
import { MacOSScrollArea } from '@/components/ui'
import { agentToContact } from '@/lib/core/agent/types'
import { useInputComposerContext } from '../InputComposerProvider'

export function MentionSuggestions() {
  const { mention } = useInputComposerContext()
  const { filteredMentionAgents, selectedMentionIndex, insertMention } = mention

  if (filteredMentionAgents.length === 0) return null

  // Calculate dynamic height based on item count (max 4 items, each ~40px)
  const itemHeight = 40
  const maxItems = 4
  const actualItems = Math.min(filteredMentionAgents.length, maxItems)
  const dynamicHeight = actualItems * itemHeight

  return (
    <div className="absolute bottom-full left-3 right-3 mb-1 backdrop-blur-sm border border-border/20 rounded-lg shadow-lg z-50 bg-popover">
      <MacOSScrollArea className={`h-[${dynamicHeight}px]`}>
        {filteredMentionAgents.map((agent: Agent, index: number) => {
          const isAllOption = agent.id === '@all'

          return (
            <div
              key={agent.id}
              className={`flex items-center gap-2 px-3 py-1 cursor-pointer first:rounded-t-lg last:rounded-b-lg ${
                index === selectedMentionIndex ? 'shadow-sm bg-muted' : ''
              }`}
              onClick={() => insertMention(agent)}
              onMouseEnter={(e) => {
                if (index === selectedMentionIndex) {
                  e.currentTarget.classList.add('bg-muted/80')
                } else {
                  e.currentTarget.classList.add('bg-muted/50')
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('bg-muted/80', 'bg-muted/50')
              }}
            >
              {/* Show different icon for @all vs regular mentions */}
              {isAllOption ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                <Avatar contact={agentToContact(agent)} size={24} />
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs leading-tight text-foreground">
                  {isAllOption ? '@all' : `@${agent.alias}`}
                </div>
                {isAllOption && (
                  <div className="text-xs opacity-70 mt-0.5 text-muted-foreground">All Members</div>
                )}
              </div>
              {index === selectedMentionIndex && (
                <div className="text-xs opacity-50 text-muted-foreground">↵</div>
              )}
            </div>
          )
        })}
      </MacOSScrollArea>
    </div>
  )
}

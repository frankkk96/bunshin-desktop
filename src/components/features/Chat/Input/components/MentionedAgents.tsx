import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { Avatar } from '@/components/common/Avatar/Avatar'
import { agentToContact } from '@/lib/core/agent/types'
import { useInputComposerContext } from '../InputComposerProvider'

/**
 * MentionedAgents component - displays the agents that have been @mentioned in the input
 * Uses state management instead of parsing strings
 */
export function MentionedAgents() {
  const { contact } = useSession()
  const { input } = useInputComposerContext()

  const availableAgents = contact?.agents ?? []
  const mentionedAgentIds = input.mentionedAgentIds

  const isAllAgents = useMemo(() => {
    return availableAgents.length > 0 && mentionedAgentIds.length === availableAgents.length
  }, [mentionedAgentIds, availableAgents])

  if (mentionedAgentIds.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-2">
      {isAllAgents ? (
        <AllAgentsTag availableAgents={availableAgents} />
      ) : (
        mentionedAgentIds.map((agentId) => <AgentTag key={agentId} agentId={agentId} />)
      )}
    </div>
  )
}

/**
 * AllAgentsTag component - displays @all with all agent avatars
 */
const AllAgentsTag = ({ availableAgents }: { availableAgents: any[] }) => {
  const { input } = useInputComposerContext()

  return (
    <div className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      {/* Avatar stack */}
      <div className="flex items-center -space-x-1">
        {availableAgents.slice(0, 3).map((agent) => (
          <div key={agent.id} className="ring-2 ring-white dark:ring-slate-800 rounded-full">
            <Avatar contact={agentToContact(agent)} size={20} />
          </div>
        ))}
        {availableAgents.length > 3 && (
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center">
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
              +{availableAgents.length - 3}
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">All agents</span>

      {/* Remove button */}
      <button
        onClick={input.clearMentionedAgents}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
        aria-label="Remove @all"
      >
        <X size={12} className="text-slate-500 dark:text-slate-400" />
      </button>
    </div>
  )
}

/**
 * AgentTag component - displays a single @agent with avatar and name
 */
const AgentTag = ({ agentId }: { agentId: string }) => {
  const { data: agent } = useAgentById(agentId)
  const { input } = useInputComposerContext()

  if (!agent) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400 dark:text-slate-500">Loading...</span>
      </div>
    )
  }

  return (
    <div className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      {/* Avatar */}
      <Avatar contact={agentToContact(agent)} size={20} />

      {/* Agent name */}
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">@{agent.alias}</span>

      {/* Remove button */}
      <button
        onClick={() => input.removeMentionedAgent(agentId)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
        aria-label={`Remove @${agent.alias}`}
      >
        <X size={12} className="text-slate-500 dark:text-slate-400" />
      </button>
    </div>
  )
}

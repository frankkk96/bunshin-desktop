import { useAllAgents } from '@/hooks/contacts/agents/query'
import { PinButton } from '@/components/common/Buttons/PinButton'
import { AvatarSection } from '@/components/common'
import { AgentInfoSection } from '@/components/features/Agents/shared/AgentInfoSection'
import { agentToContact } from '@/lib/core/agent/types'

export function AgentProfileSection({ agentId }: { agentId?: string }) {
  if (!agentId) {
    return null
  }

  const { data: agents } = useAllAgents()
  const agent = agents?.find((agent) => agent.id === agentId)

  if (!agent) {
    return null
  }

  return (
    <div className={`mb-10 relative`}>
      {/* Pin Button - Top Right */}
      <div className="absolute top-0 right-0 z-10">
        <PinButton agentId={agentId} />
      </div>

      <div className="flex gap-6 items-center">
        {/* Avatar Section - Left */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <AvatarSection contact={agentToContact(agent)} />
        </div>

        {/* Information Section - Right */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          <AgentInfoSection agent={agent} />
        </div>
      </div>
    </div>
  )
}

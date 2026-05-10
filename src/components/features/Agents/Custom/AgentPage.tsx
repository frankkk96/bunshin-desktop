import { DeleteButton, DetailLayout, NotFoundView } from '@/components/common'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { MacOSSeparator } from '@/components/ui'
import { AgentProfileSection } from '@/components/features/Agents/shared/AgentProfileSection'
import { AgentConfigForm } from './AgentConfigForm'

export function AgentPage({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentById(agentId)
  const { deleteAgent } = useAgentMutations()

  if (!agent) {
    return <NotFoundView entityType="Agent" />
  }

  return (
    <DetailLayout>
      <AgentProfileSection agentId={agentId} />
      <MacOSSeparator className="mb-8 bg-border opacity-30" />
      <AgentConfigForm agentId={agentId} />
      <div className="mt-8">
        <DeleteButton
          text="Delete Agent"
          onDelete={() => deleteAgent.mutate(agent.id)}
          confirmMessage="Are you sure you want to delete this agent? This action cannot be undone."
        />
      </div>
    </DetailLayout>
  )
}

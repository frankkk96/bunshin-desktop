import { NotFoundView } from '@/components/common'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { AgentPage } from './Custom/AgentPage'

export function AgentOverview({ agentId }: { agentId: string }) {
  // Use base query to determine agent type
  const { data: agent } = useAgentById(agentId)

  if (!agent) {
    return <NotFoundView entityType="Agent" />
  }

  return <AgentPage agentId={agentId} />
}

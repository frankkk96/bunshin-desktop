import { NotFoundView } from '@/components/common'
import type { Agent } from '@/lib/core/agent/types'
import { ModelProviderSection } from './components/BasicSettings/ModelProviderSection'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { ExtensionsSection } from './components/Extensions/ExtensionsSection'
import { PromptsSection } from './components/Prompts/PromptsSection'
import { useModelsByProvider } from '@/hooks/models/useModels'
import { useMemo } from 'react'

export function AgentConfigForm({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentById(agentId)
  const { updateAgent } = useAgentMutations()
  const { data: models = [] } = useModelsByProvider(agent?.llm.providerId ?? '')

  const currentModel = useMemo(() => {
    if (!agent) return null
    return models.find((m) => m.id === agent.llm.modelId)
  }, [agent, models])

  const supportsToolCalls = currentModel?.toolCall ?? false

  if (!agent) {
    return <NotFoundView entityType="Agent" />
  }

  const onUpdate = (updates: Partial<Agent>) => {
    const updatedAgent = { ...agent, ...updates }
    updateAgent.mutate(updatedAgent)
  }

  return (
    <div className="space-y-4">
      <ModelProviderSection agent={agent} onUpdate={onUpdate} />
      <PromptsSection agent={agent} onUpdate={onUpdate} />
      {supportsToolCalls && <ExtensionsSection agent={agent} onUpdate={onUpdate} />}
    </div>
  )
}

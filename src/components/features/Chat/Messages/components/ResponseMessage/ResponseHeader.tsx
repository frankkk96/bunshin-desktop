import { useMemo } from 'react'
import type { Agent } from '@/lib/core/agent/types'
import { ProviderIcon } from '@/components/common'
import { useNavigate } from 'react-router-dom'
import { useProviders } from '@/hooks/models/useModels'

interface ResponseHeaderProps {
  agent: Agent
}

export const ResponseHeader = ({ agent }: ResponseHeaderProps) => {
  const navigate = useNavigate()
  const { data: providers = [] } = useProviders()

  // 获取 provider 的 avatar
  const avatar = useMemo(() => {
    const provider = providers.find((p) => p.id === agent.llm.providerId)
    return provider?.avatar ?? agent.llm.providerId
  }, [providers, agent.llm.providerId])

  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 flex-shrink-0"
        onClick={() => {
          navigate(`/contacts/${agent.id}`)
        }}
      >
        <ProviderIcon provider={avatar} size={26} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground leading-tight">{agent.alias}</span>
        {agent.description && (
          <span className="text-xs text-muted-foreground truncate leading-tight">
            {agent.description}
          </span>
        )}
      </div>
    </div>
  )
}

ResponseHeader.displayName = 'ResponseHeader'

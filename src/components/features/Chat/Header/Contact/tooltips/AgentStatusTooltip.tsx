import { useMemo } from 'react'
import { MacOSTooltip, MacOSTooltipContent, MacOSTooltipTrigger } from '@/components/ui'
import { CustomAgentStatusTrigger } from '../ContactStatusTrigger'
import { Agent } from '@/lib/core/agent/types'
import { useStatusStore } from '@/stores/status-store'
import { selectAgentStatus } from '@/stores/status-selectors'
import { cn } from '@/lib/ui/utils'

export function AgentStatusTooltip({ agent }: { agent: Agent }) {
  const extensions = useStatusStore((state) => state.extensions)
  const agentStatus = useMemo(() => selectAgentStatus(agent)({ extensions }), [agent, extensions])

  // Find current model info
  const currentModel = agentStatus.providerModels?.find((m) => m.id === agentStatus.currentModelId)

  return (
    <MacOSTooltip>
      <MacOSTooltipTrigger asChild>
        <CustomAgentStatusTrigger status={agentStatus} isLoading={false} />
      </MacOSTooltipTrigger>
      <MacOSTooltipContent>
        <div className="space-y-2 max-w-xs">
          {agentStatus.issues.length === 0 && !agentStatus.isReady && (
            <div className="text-xs text-blue-400 mb-2">Initializing...</div>
          )}

          <div className="text-xs space-y-2">
            {/* Provider */}
            {agentStatus.providerId && (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      agentStatus.providerConfigured ? 'bg-green-500' : 'bg-red-500',
                    )}
                  />
                  <span className="font-medium">Provider:</span>
                </div>
                <div className="ml-4 text-gray-400">
                  - {agentStatus.providerId}{' '}
                  {agentStatus.providerConfigured ? '' : '(not configured)'}
                </div>
              </div>
            )}

            {/* Model */}
            {currentModel && (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full bg-green-500')} />
                  <span className="font-medium">Model:</span>
                </div>
                <div className="ml-4 text-gray-400">
                  - {agentStatus.currentModelId} ({currentModel.limit.context.toLocaleString()}
                  {(() => {
                    // Price is now at the Model level
                    if (currentModel.cost) {
                      return ` - $${currentModel.cost.input.toFixed(
                        2,
                      )}/$${currentModel.cost.output.toFixed(2)}`
                    }
                    return ''
                  })()}
                  )
                </div>
              </div>
            )}

            {/* Extensions */}
            {agentStatus.extensions && agentStatus.extensions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      agentStatus.extensions.every((ext) => ext.isReady)
                        ? 'bg-green-500'
                        : agentStatus.extensions.some((ext) => ext.isReady)
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                    )}
                  />
                  <span className="font-medium">Extensions:</span>
                </div>
                <div className="ml-4 space-y-0.5">
                  {agentStatus.extensions.map((ext) => (
                    <div key={ext.id}>
                      <div className="text-gray-400">
                        - {ext.name}
                        {ext.type === 'mcp' &&
                          ext.extensionTools &&
                          ext.extensionTools.length > 0 && (
                            <span>
                              {' '}
                              ({ext.extensionTools.length} tool
                              {ext.extensionTools.length !== 1 ? 's' : ''})
                            </span>
                          )}
                      </div>
                      {!ext.isReady && ext.issues && ext.issues.length > 0 && (
                        <div className="ml-3 text-red-400">
                          {ext.issues.slice(0, 2).map((issue: string, i: number) => (
                            <div key={i}>• {issue}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Issues List */}
          {agentStatus.issues.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400">Issues:</div>
              {agentStatus.issues.slice(0, 3).map((issue, i) => (
                <div key={i} className="text-xs text-red-400">
                  • {issue}
                </div>
              ))}
              {agentStatus.issues.length > 3 && (
                <div className="text-xs text-gray-500">
                  ... and {agentStatus.issues.length - 3} more
                </div>
              )}
            </>
          )}
        </div>
      </MacOSTooltipContent>
    </MacOSTooltip>
  )
}

import { useMemo } from 'react'
import { MacOSTooltip, MacOSTooltipContent, MacOSTooltipTrigger } from '@/components/ui'
import { GroupStatusTrigger } from '../ContactStatusTrigger'
import { Group } from '@/lib/core/group/types'
import { useStatusStore } from '@/stores/status-store'
import { selectGroupStatus } from '@/stores/status-selectors'

export function GroupStatusTooltip({ group }: { group: Group }) {
  const extensions = useStatusStore((state) => state.extensions)
  const groupStatus = useMemo(
    () => selectGroupStatus(group)({ extensions }),
    [group, extensions],
  )

  // Calculate stats from agents array
  const totalAgents = groupStatus.agents.length
  const readyCount = groupStatus.agents.filter((agent) => agent.isReady).length
  const totalIssues = groupStatus.agents.reduce((total, agent) => total + agent.issues.length, 0)

  return (
    <MacOSTooltip>
      <MacOSTooltipTrigger asChild>
        <GroupStatusTrigger status={groupStatus} isLoading={false} />
      </MacOSTooltipTrigger>
      <MacOSTooltipContent>
        <div className="space-y-2 max-w-xs">
          <div className="font-medium">Group Status</div>

          {/* Group Status Summary */}
          {groupStatus.isReady ? (
            <div className="text-xs text-green-400">
              ✓ All agents ready ({readyCount}/{totalAgents})
            </div>
          ) : totalIssues === 0 ? (
            <div className="text-xs text-blue-400">
              Initializing... ({readyCount}/{totalAgents} ready)
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-400">
                {readyCount}/{totalAgents} agents ready
                {totalIssues > 0 && ` • ${totalIssues} total issue${totalIssues !== 1 ? 's' : ''}`}
              </div>

              {/* Show problems for each agent */}
              {groupStatus.agents &&
                groupStatus.agents
                  .filter((agent) => !agent.isReady)
                  .map((agent) => {
                    const totalExtensions = agent.extensions?.length || 0
                    const readyExtensions =
                      agent.extensions?.filter((ext) => ext.isReady).length || 0

                    return (
                      <div key={agent.id} className="border-t border-gray-600 pt-1 mt-1">
                        <div className="text-xs font-medium">{agent.name}</div>
                        <div className="ml-2 space-y-0.5">
                          {agent.providerConfigured === false && (
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-1 h-1 rounded-full bg-red-500" />
                              <span className="text-red-400">
                                Provider: {agent.providerId} (not configured)
                              </span>
                            </div>
                          )}
                          {totalExtensions > 0 && readyExtensions < totalExtensions && (
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-1 h-1 rounded-full bg-yellow-500" />
                              <span className="text-yellow-400">
                                Extensions: {readyExtensions}/{totalExtensions} ready
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
            </>
          )}
        </div>
      </MacOSTooltipContent>
    </MacOSTooltip>
  )
}

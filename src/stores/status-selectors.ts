/**
 * Status Selectors
 *
 * 派生状态选择器，用于计算 Agent 和 Group 的聚合状态
 */

import type { StatusStore } from './status-store'
import type { Agent } from '@/lib/core/agent/types'
import type { Group } from '@/lib/core/group/types'
import type { AgentStatusData, GroupStatusData } from '@/hooks/status/types'
import type { ExtensionStatus } from '@/lib/core/extensions/types'
import { providerService } from '@/lib/core/providers/provider-service'

/**
 * 选择 Agent 的聚合状态
 */
export const selectAgentStatus =
  (agent: Agent) =>
  (state: StatusStore): AgentStatusData => {
    const providerId = agent.llm.providerId

    // 获取所有 extension 状态
    const extensionStatuses = agent.extension.mcpServers
      .map((server) => state.extensions.get(server.id))
      .filter((s): s is ExtensionStatus => s !== null && s !== undefined)

    // 获取 provider models
    const provider = providerService.getProviderById(providerId)
    const providerModels = provider.models
    const providerConfigured = provider.configured

    // 收集 issues
    const issues: string[] = []

    if (!providerConfigured) {
      issues.push(`Provider "${providerId}" is not configured`)
    }

    extensionStatuses.forEach((extStatus) => {
      if (!extStatus.isReady) {
        issues.push(...extStatus.issues)
      }
    })

    // 计算 isReady
    const isReady =
      providerConfigured &&
      extensionStatuses.length === agent.extension.mcpServers.length &&
      extensionStatuses.every((s) => s.isReady)

    return {
      id: agent.id,
      name: agent.alias,
      isReady,
      providerId: providerId,
      providerConfigured,
      providerModels,
      currentModelId: agent.llm.modelId,
      extensions: extensionStatuses,
      issues,
    }
  }

/**
 * 选择 Group 的聚合状态
 */
export const selectGroupStatus =
  (group: Group) =>
  (state: StatusStore): GroupStatusData => {
    const agentStatuses = group.agents.map((agent) => selectAgentStatus(agent)(state))

    return {
      isReady: agentStatuses.every((status) => status.isReady),
      agents: agentStatuses,
    }
  }

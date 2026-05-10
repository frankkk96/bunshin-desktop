/**
 * ExecutionStatus - 聊天窗口的统一执行状态显示组件
 * 显示当前执行的 workflow 进度和状态
 * 按照最新的三层结构：Workflow -> Query[] -> Task[]
 */

import { useMemo } from 'react'
import {
  IoCloseCircle,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoRefreshOutline,
  IoBookmarkOutline,
  IoStopOutline,
} from 'react-icons/io5'
import { ImSpinner8 } from 'react-icons/im'
import { IconButton, ProviderIcon } from '@/components/common'
import { ExecutionPlan } from './ExecutionPlan'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'
import { useAgentMutations } from '@/hooks/contacts/agents/mutations'
import { useGroupMutations } from '@/hooks/contacts/groups/mutations'
import { useGroupById } from '@/hooks/contacts/groups/query'
import { useAgentsByIds } from '@/hooks/contacts/agents/query'
import { useProviders } from '@/hooks/models/useModels'
import { promptId } from '@/lib/core/utils/random'
import { toast } from '@/lib/core/utils/toast'

const MAX_VISIBLE_AGENTS = 3

// TODO: 点击停止的时候没反应需要修
export function ExecutionStatus() {
  const { session, workflow, contact } = useSession()
  const { cancel, retryQuery } = useSessionActions(session?.id)
  const { updateAgent } = useAgentMutations()
  const { updateGroup } = useGroupMutations()
  const { data: group } = useGroupById(contact?.type === 'group' ? contact.id : '')
  const { data: providers = [] } = useProviders()

  // 创建 providerId -> avatar 的映射
  const providerAvatarMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const provider of providers) {
      map.set(provider.id, provider.avatar)
    }
    return map
  }, [providers])

  // 获取 provider 的 avatar
  const getProviderAvatar = (providerId: string): string => {
    return providerAvatarMap.get(providerId) ?? providerId
  }

  const currentQuery = useMemo(() => {
    if (!workflow) return null
    const runningQuery = workflow.queries.find((q) => q.status === 'running')
    const notPendingQueries = workflow.queries.filter((q) => q.status !== 'pending')
    const lastNotPendingQuery =
      notPendingQueries.length > 0 ? notPendingQueries[notPendingQueries.length - 1] : null
    return runningQuery || lastNotPendingQuery
  }, [workflow?.queries])

  const agents = useAgentsByIds(currentQuery?.message.agents ?? [])
  const visibleAgents = agents.slice(0, MAX_VISIBLE_AGENTS)
  const hiddenCount = agents.length - MAX_VISIBLE_AGENTS

  const lastQuery = useMemo(() => {
    if (!workflow || workflow.queries.length === 0) return null
    return workflow.queries[workflow.queries.length - 1]
  }, [workflow?.queries])

  if (!session || !workflow) {
    return null
  }

  if (workflow.status === 'idle') {
    return null
  }

  const handleRetry = () => {
    if (lastQuery) {
      retryQuery(lastQuery.queryId)
    }
  }

  const handleSavePrompt = () => {
    if (!contact || !workflow) return

    // 将 workflow 中的所有 query 转换为 prompt 格式
    const queries = workflow.queries.map((q) => ({
      sessionId: session.id,
      text: q.message.text,
      agents: q.message.agents,
      medias: q.message.medias,
    }))

    // 生成 key: 使用第一个 query 的前几个字作为 key
    const firstText = queries[0]?.text || ''
    const key = firstText.slice(0, 20).trim() || 'prompt'

    const newPrompt = {
      id: promptId(),
      key,
      queries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (contact.type === 'agent') {
      const agent = contact.agents[0]
      if (!agent) return

      updateAgent.mutate(
        {
          ...agent,
          prompt: {
            ...agent.prompt,
            shortcuts: [...agent.prompt.shortcuts, newPrompt],
          },
        },
        {
          onSuccess: () => {
            toast.success('Prompt Saved')
          },
        },
      )
    } else if (contact.type === 'group' && group) {
      updateGroup.mutate(
        {
          ...group,
          shortcuts: [...group.shortcuts, newPrompt],
        },
        {
          onSuccess: () => {
            toast.success('Prompt Saved')
          },
        },
      )
    }
  }

  const content = (
    <div className="flex items-center gap-5 px-3 py-1.5 rounded-md text-sm border border-border bg-background text-foreground">
      {workflow.status === 'failed' && <IoWarningOutline size={16} className="text-destructive" />}
      {workflow.status === 'cancelled' && (
        <IoCloseCircle size={16} className="text-muted-foreground" />
      )}
      {workflow.status === 'running' && (
        <ImSpinner8 size={14} className="text-primary animate-spin" />
      )}
      {workflow.status === 'succeeded' && (
        <IoCheckmarkCircleOutline size={16} className="text-green-500" />
      )}
      <div className="flex items-center gap-1 font-medium">
        {agents.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {visibleAgents.map((agent) => (
              <div
                key={agent.id}
                className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-background"
              >
                <ProviderIcon provider={getProviderAvatar(agent.llm.providerId)} size={14} />
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-background">
                <span className="text-[10px] font-medium text-muted-foreground">
                  +{hiddenCount}
                </span>
              </div>
            )}
          </div>
        )}
        <span className="truncate max-w-[120px]">{currentQuery?.message.text}</span>
      </div>
      {workflow.status === 'running' && (
        <IconButton
          onClick={() => {
            session.id && workflow.status === 'running' && cancel()
          }}
          className="!p-1"
        >
          <IoStopOutline size={14} className="text-destructive" />
        </IconButton>
      )}
      {(workflow.status === 'failed' || workflow.status === 'cancelled') && (
        <IconButton onClick={handleRetry} className="!p-1">
          <IoRefreshOutline size={14} className="text-primary" />
        </IconButton>
      )}
      {workflow.status === 'succeeded' && (
        <IconButton onClick={handleSavePrompt} className="!p-1">
          <IoBookmarkOutline size={14} className="text-primary" />
        </IconButton>
      )}
    </div>
  )

  return (
    <ExecutionPlan workflow={workflow} trigger="hover">
      {content}
    </ExecutionPlan>
  )
}

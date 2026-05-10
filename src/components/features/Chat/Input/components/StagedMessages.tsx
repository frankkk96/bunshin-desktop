import { useState } from 'react'
import { Check, X, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/common'
import { useAgentById } from '@/hooks/contacts/agents/query'
import { useGroupById } from '@/hooks/contacts/groups/query'
import { Avatar } from '@/components/common/Avatar/Avatar'
import {
  MacOSScrollArea,
  MacOSPopover,
  MacOSPopoverContent,
  MacOSPopoverTrigger,
  MacOSCheckbox,
} from '@/components/ui'
import { agentToContact } from '@/lib/core/agent/types'
import { useInputComposerContext } from '../InputComposerProvider'
import { useSession } from '../../SessionProvider'
import type { StagedQuery } from '../InputStateProvider'

/**
 * StagedQueryItem - 单条暂存查询
 */
function StagedQueryItem({
  query,
  index,
  onRemove,
  onUpdate,
}: {
  query: StagedQuery
  index: number
  onRemove: () => void
  onUpdate: (updates: Partial<StagedQuery>) => void
}) {
  const { session } = useSession()
  if (!session) {
    return null
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(query.text)

  // 获取 group 信息（如果 contactId 是 group）
  const { data: group } = useGroupById(session.contactId)
  const availableAgents = group?.agents || []

  const handleSaveText = () => {
    onUpdate({ text: editText.trim() })
    setIsEditing(false)
  }

  const handleCancelText = () => {
    setEditText(query.text)
    setIsEditing(false)
  }

  const handleAgentToggle = (agentId: string) => {
    const currentAgents = query.agents || []
    const newAgents = currentAgents.includes(agentId)
      ? currentAgents.filter((id) => id !== agentId)
      : [...currentAgents, agentId]
    onUpdate({ agents: newAgents })
  }

  return (
    <div className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/50">
      {/* Index badge */}
      <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-muted text-foreground">
        <span className="text-xs font-semibold">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveText}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={handleCancelText}
                className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md flex items-center gap-1"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Query text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-foreground line-clamp-2 font-medium">
                {query.text || (
                  <span className="text-muted-foreground italic opacity-75 font-normal">
                    {query.medias?.some((m) => m.media.type === 'image')
                      ? '📷 Image'
                      : query.medias?.some((m) => m.media.type === 'pdf')
                      ? '📄 PDF'
                      : 'Empty'}
                  </span>
                )}
              </p>
            </div>

            {/* Agents and Attachments */}
            <div className="flex-shrink-0 flex items-center gap-1">
              {/* Agents area - 整体可点击 */}
              {group && availableAgents.length > 0 ? (
                <MacOSPopover>
                  <MacOSPopoverTrigger asChild>
                    <button className="flex items-center h-auto px-1.5 py-0.5 gap-1 border border-dashed rounded-md hover:bg-muted/80 hover:cursor-pointer">
                      {query.agents?.slice(0, 5).map((agentId) => (
                        <AgentAvatar key={agentId} agentId={agentId} />
                      ))}
                      {query.agents && query.agents.length > 5 && (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            +{query.agents.length - 5}
                          </span>
                        </div>
                      )}
                      {(!query.agents || query.agents.length === 0) && (
                        <span className="text-xs text-muted-foreground">
                          Select agents
                        </span>
                      )}
                    </button>
                  </MacOSPopoverTrigger>
                  <MacOSPopoverContent className="p-1!" align="end">
                    <div className="space-y-0.5">
                      {availableAgents.map((agent) => {
                        const isSelected = query.agents?.includes(agent.id)
                        return (
                          <div
                            key={agent.id}
                            onClick={() => handleAgentToggle(agent.id)}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded cursor-pointer"
                          >
                            <MacOSCheckbox checked={isSelected} />
                            <AgentInfo agentId={agent.id} />
                          </div>
                        )
                      })}
                    </div>
                  </MacOSPopoverContent>
                </MacOSPopover>
              ) : (
                // 非 group 场景，只显示头像
                <>
                  {query.agents?.slice(0, 5).map((agentId) => (
                    <AgentAvatar key={agentId} agentId={agentId} />
                  ))}
                  {query.agents && query.agents.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        +{query.agents.length - 5}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Attachments */}
              {query.medias?.some((m) => m.media.type === 'image') && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs">📷</span>
                </div>
              )}
              {query.medias?.some((m) => m.media.type === 'pdf') && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs">📄</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
          <IconButton
            onClick={() => setIsEditing(true)}
            className="hover:text-primary h-7 w-7 p-0 flex items-center justify-center"
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            onClick={onRemove}
            className="hover:text-destructive h-7 w-7 p-0 flex items-center justify-center"
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

/**
 * AgentAvatar - 只显示头像的组件
 */
function AgentAvatar({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentById(agentId)

  if (!agent) {
    return (
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">?</span>
      </div>
    )
  }

  return <Avatar contact={agentToContact(agent)} size={24} />
}

/**
 * AgentInfo - 用于下拉选择器中显示的 agent 信息
 */
function AgentInfo({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentById(agentId)

  if (!agent) {
    return <span className="text-muted-foreground">@{agentId}</span>
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar contact={agentToContact(agent)} size={20} />
      <span className="font-medium text-sm">{agent.alias}</span>
    </div>
  )
}

/**
 * StagedMessages - 显示暂存的查询队列
 * 支持编辑查询文本、管理 agents（如果是 group）、删除查询
 * 使用与 MentionSuggestions 和 PromptSuggestions 相同的容器样式
 */
export function StagedMessages() {
  const { input } = useInputComposerContext()

  if (input.stagedQueries.length === 0) {
    return null
  }

  const handleUpdate = (index: number, updates: Partial<StagedQuery>) => {
    input.updateStagedQuery(index, updates)
  }

  // Calculate dynamic height (max 8 items, each ~40px)
  const itemHeight = 40
  const maxItems = 8
  const actualItems = Math.min(input.stagedQueries.length, maxItems)
  const dynamicHeight = actualItems * itemHeight

  return (
    <div className="mb-1 backdrop-blur-sm border border-border/20 rounded-lg shadow-lg animate-in fade-in-0 slide-in-from-bottom-1 duration-150 bg-popover">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <span className="text-xs font-medium text-muted-foreground">
          Staged ({input.stagedQueries.length})
        </span>
        <button
          onClick={input.resetInput}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear All
        </button>
      </div>

      {/* Content */}
      <MacOSScrollArea className={`h-[${dynamicHeight}px]`}>
        {input.stagedQueries.map((query, index) => (
          <StagedQueryItem
            key={query.id}
            query={query}
            index={index}
            onRemove={() => input.removeStagedQuery(index)}
            onUpdate={(updates) => handleUpdate(index, updates)}
          />
        ))}
      </MacOSScrollArea>
    </div>
  )
}

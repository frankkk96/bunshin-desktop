import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  MacOSSheet,
  MacOSSheetContent,
  MacOSInput,
  MacOSButton,
  MacOSPopover,
  MacOSPopoverContent,
  MacOSPopoverTrigger,
  MacOSCheckbox,
} from '@/components/ui'
import type { QueryParams } from '@/lib/core/execution/types'
import { Prompt } from '@/lib/core/agent/types'
import { Contact } from '@/hooks/contacts/shared/types'
import { Avatar } from '@/components/common/Avatar/Avatar'
import { agentToContact } from '@/lib/core/agent/types'
import { useAgentById } from '@/hooks/contacts/agents/query'
import type { Agent } from '@/lib/core/agent/types'

interface PromptModalProps {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  onSave: (data: { key: string; queries: QueryParams[] }) => void
  onDelete?: () => void
  editingPrompt?: Prompt
}

/**
 * MessageAgentSelector - Agent selector for each message in group context
 * Displays avatars with popover for selection
 */
function MessageAgentSelector({
  availableAgents,
  selectedAgents,
  onToggleAgent,
}: {
  availableAgents: Agent[]
  selectedAgents: string[]
  onToggleAgent: (agentId: string) => void
}) {
  return (
    <MacOSPopover>
      <MacOSPopoverTrigger asChild>
        <button className="flex items-center h-auto px-1.5 py-1.5 gap-1 border border-dashed rounded-md hover:bg-background hover:cursor-pointer shrink-0">
          {selectedAgents.slice(0, 3).map((agentId) => (
            <AgentAvatar key={agentId} agentId={agentId} />
          ))}
          {selectedAgents.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                +{selectedAgents.length - 3}
              </span>
            </div>
          )}
          {selectedAgents.length === 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-400 px-1">Select agents</span>
          )}
        </button>
      </MacOSPopoverTrigger>
      <MacOSPopoverContent className="p-1" align="start">
        <div className="space-y-0.5">
          {availableAgents.map((agent) => {
            const isSelected = selectedAgents.includes(agent.id)
            return (
              <div
                key={agent.id}
                onClick={() => onToggleAgent(agent.id)}
                className="flex items-center gap-2 px-2 py-1 hover:bg-background rounded cursor-pointer"
              >
                <MacOSCheckbox checked={isSelected} />
                <AgentInfo agent={agent} />
              </div>
            )
          })}
        </div>
      </MacOSPopoverContent>
    </MacOSPopover>
  )
}

/**
 * AgentAvatar - displays agent avatar
 */
function AgentAvatar({ agentId }: { agentId: string }) {
  const { data: agent } = useAgentById(agentId)

  if (!agent) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <span className="text-[10px] text-slate-600 dark:text-slate-400">?</span>
      </div>
    )
  }

  return <Avatar contact={agentToContact(agent)} size={20} />
}

/**
 * AgentInfo - displays agent info in selector dropdown
 */
function AgentInfo({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar contact={agentToContact(agent)} size={20} />
      <span className="font-medium text-sm">{agent.alias}</span>
    </div>
  )
}

export function PromptModal({
  contact,
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingPrompt,
}: PromptModalProps) {
  const [key, setKey] = useState('')
  const [queries, setQueries] = useState<QueryParams[]>([])

  const allAgentIds = useMemo(() => contact.agents.map((a) => a.id), [contact.agents])

  useEffect(() => {
    if (!isOpen) return

    if (editingPrompt) {
      setKey(editingPrompt.key)
      setQueries(
        editingPrompt.queries.map((q) => ({
          sessionId: '',
          text: q.text,
          agents: q.agents && q.agents.length > 0 ? q.agents : allAgentIds,
          medias: q.medias ?? [],
        })),
      )
      return
    }

    setKey('')
    setQueries([
      {
        sessionId: '',
        text: '',
        agents: allAgentIds,
        medias: [],
      },
    ])
  }, [isOpen, editingPrompt, allAgentIds])

  const sanitizeKey = (value: string) => value.replace(/^\/+/, '/')

  const handleAddQuery = () => {
    setQueries([
      ...queries,
      {
        sessionId: '',
        text: '',
        agents: contact.agents.map((a) => a.id),
        medias: [],
      },
    ])
  }

  const handleRemoveQuery = (index: number) => {
    if (queries.length > 1) {
      setQueries(queries.filter((_, i) => i !== index))
    }
  }

  const handleUpdateQuery = (index: number, text: string) => {
    const updated = [...queries]
    updated[index].text = text
    setQueries(updated)
  }

  const handleUpdateQueryAgents = (index: number, agents: string[]) => {
    const updated = [...queries]
    updated[index].agents = agents
    setQueries(updated)
  }

  const handleToggleAgent = (queryIndex: number, agentId: string) => {
    const query = queries[queryIndex]
    const currentAgents = query.agents || []
    const newAgents = currentAgents.includes(agentId)
      ? currentAgents.filter((id) => id !== agentId)
      : [...currentAgents, agentId]
    handleUpdateQueryAgents(queryIndex, newAgents)
  }

  const isGroup = contact.type === 'group'

  const handleSave = () => {
    const sanitizedKey = sanitizeKey(key)
    const validQueries = queries.filter((q) => q.text.trim())

    if (!sanitizedKey.trim() || validQueries.length === 0) return

    onSave({
      key: sanitizedKey,
      queries: validQueries.map((q) => ({
        ...q,
        text: q.text,
        // For groups, use the selected agents; for agents, use all agents
        agents: isGroup ? q.agents || [] : contact.agents.map((a) => a.id),
      })),
    })
  }

  const isFormValid = () => {
    const sanitizedKey = sanitizeKey(key)
    const validQueries = queries.filter((q) => q.text.trim())
    return sanitizedKey.trim() && validQueries.length > 0
  }

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="700px" height="500px">
      <MacOSSheetContent className="p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">
              {editingPrompt ? 'Edit Prompt' : 'Create Prompt'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Type "/" in chat to trigger prompts
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-background cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto space-y-3">
          {/* Key */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Key *</label>
            <MacOSInput
              value={key}
              onChange={(e) => setKey(sanitizeKey(e.target.value))}
              placeholder="hello"
            />
          </div>

          {/* Queries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">
                Queries ({queries.length})
              </label>
              <MacOSButton
                size="sm"
                variant="ghost"
                onClick={handleAddQuery}
                className="h-6 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </MacOSButton>
            </div>

            <div className="space-y-2">
              {queries.map((query, index) => (
                <div key={index} className="flex gap-2 items-start">
                  {/* Agent selector for groups - on the left */}
                  {isGroup && (
                    <MessageAgentSelector
                      availableAgents={contact.agents}
                      selectedAgents={query.agents || []}
                      onToggleAgent={(agentId) => handleToggleAgent(index, agentId)}
                    />
                  )}

                  {/* Query input */}
                  <MacOSInput
                    value={query.text}
                    onChange={(e) => handleUpdateQuery(index, e.target.value)}
                    placeholder={`Query ${index + 1}`}
                    className="flex-1"
                  />

                  {/* Delete button */}
                  {queries.length > 1 && (
                    <button
                      onClick={() => handleRemoveQuery(index)}
                      className="p-2 text-muted-foreground/50 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/20 px-4 py-3 flex items-center justify-between gap-2">
          {/* Delete button - only show when editing */}
          {editingPrompt && onDelete ? (
            <MacOSButton
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="text-destructive"
            >
              Delete
            </MacOSButton>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <MacOSButton onClick={onClose} variant="outline" size="sm">
              Cancel
            </MacOSButton>
            <MacOSButton onClick={handleSave} disabled={!isFormValid()} size="sm">
              {editingPrompt ? 'Save Changes' : 'Create'}
            </MacOSButton>
          </div>
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

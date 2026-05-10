import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Pencil } from 'lucide-react'
import {
  MacOSSheet,
  MacOSSheetContent,
  MacOSScrollArea,
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
import { cn } from '@/lib/ui/utils'
import { ask } from '@tauri-apps/plugin-dialog'

interface PromptListModalProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact
  onUpdate: (shortcuts: Prompt[]) => void
}

/**
 * MessageAgentSelector - Agent selector for each message in group context
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

function AgentInfo({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar contact={agentToContact(agent)} size={20} />
      <span className="font-medium text-sm">{agent.alias}</span>
    </div>
  )
}

// Editing prompt state
interface EditingPrompt {
  id?: string
  key: string
  queries: QueryParams[]
  isNew?: boolean
}

function createDefaultPrompt(allAgentIds: string[]): EditingPrompt {
  return {
    key: '',
    queries: [
      {
        sessionId: '',
        text: '',
        agents: allAgentIds,
        medias: [],
      },
    ],
    isNew: true,
  }
}

function promptToEditing(prompt: Prompt, allAgentIds: string[]): EditingPrompt {
  return {
    id: prompt.id,
    key: prompt.key,
    queries: prompt.queries.map((q) => ({
      sessionId: '',
      text: q.text,
      agents: q.agents && q.agents.length > 0 ? q.agents : allAgentIds,
      medias: q.medias ?? [],
    })),
  }
}

// Detail panel for viewing/editing a prompt
function PromptDetailPanel({
  prompt,
  editingPrompt,
  contact,
  onSelect,
  onEdit,
  onDelete,
  onEditingChange,
  onSave,
  onCancelEdit,
}: {
  prompt: Prompt | undefined
  editingPrompt: EditingPrompt | null
  contact: Contact
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onEditingChange: (updates: Partial<EditingPrompt>) => void
  onSave: () => void
  onCancelEdit: () => void
}) {
  const isGroup = contact.type === 'group'

  const sanitizeKey = (value: string) => value.replace(/^\/+/, '/')

  const handleAddQuery = () => {
    if (!editingPrompt) return
    onEditingChange({
      queries: [
        ...editingPrompt.queries,
        {
          sessionId: '',
          text: '',
          agents: contact.agents.map((a) => a.id),
          medias: [],
        },
      ],
    })
  }

  const handleRemoveQuery = (index: number) => {
    if (!editingPrompt || editingPrompt.queries.length <= 1) return
    onEditingChange({
      queries: editingPrompt.queries.filter((_, i) => i !== index),
    })
  }

  const handleUpdateQuery = (index: number, text: string) => {
    if (!editingPrompt) return
    const updated = [...editingPrompt.queries]
    updated[index] = { ...updated[index], text }
    onEditingChange({ queries: updated })
  }

  const handleToggleAgent = (queryIndex: number, agentId: string) => {
    if (!editingPrompt) return
    const query = editingPrompt.queries[queryIndex]
    const currentAgents = query.agents || []
    const newAgents = currentAgents.includes(agentId)
      ? currentAgents.filter((id) => id !== agentId)
      : [...currentAgents, agentId]
    const updated = [...editingPrompt.queries]
    updated[queryIndex] = { ...updated[queryIndex], agents: newAgents }
    onEditingChange({ queries: updated })
  }

  const isFormValid = () => {
    if (!editingPrompt) return false
    const sanitizedKey = sanitizeKey(editingPrompt.key)
    const validQueries = editingPrompt.queries.filter((q) => q.text.trim())
    return sanitizedKey.trim() && validQueries.length > 0
  }

  // Editing mode
  if (editingPrompt) {
    const isNew = editingPrompt.isNew

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium bg-muted text-foreground">
              /
            </div>
            <MacOSInput
              value={editingPrompt.key}
              onChange={(e) => onEditingChange({ key: sanitizeKey(e.target.value) })}
              placeholder="command"
              className="h-7 text-sm font-medium flex-1"
              autoFocus={isNew}
            />
          </div>
        </div>

        {/* Queries */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 space-y-1.5">
            {editingPrompt.queries.map((query, index) => (
              <div
                key={index}
                className="flex gap-2 items-center p-2 rounded-md bg-muted/20 hover:bg-muted/30 group"
              >
                <span className="text-xs text-muted-foreground/60 w-4 text-center flex-shrink-0">
                  {index + 1}
                </span>

                {/* Agent selector for groups */}
                {isGroup && (
                  <MessageAgentSelector
                    availableAgents={contact.agents}
                    selectedAgents={query.agents || []}
                    onToggleAgent={(agentId) => handleToggleAgent(index, agentId)}
                  />
                )}

                <MacOSInput
                  value={query.text}
                  onChange={(e) => handleUpdateQuery(index, e.target.value)}
                  placeholder="Enter query text..."
                  className="flex-1 h-7 text-sm bg-transparent border-0 focus:ring-0 px-0"
                />

                {editingPrompt.queries.length > 1 && (
                  <button
                    onClick={() => handleRemoveQuery(index)}
                    className="p-1 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Add query button */}
            <button
              onClick={handleAddQuery}
              className="w-full flex items-center gap-2 p-2 rounded-md text-xs text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add query
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border/10 flex items-center gap-2">
          <MacOSButton variant="ghost" size="sm" onClick={onCancelEdit} className="flex-1">
            Cancel
          </MacOSButton>
          <MacOSButton
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!isFormValid()}
            className="flex-1"
          >
            {isNew ? 'Add' : 'Save'}
          </MacOSButton>
        </div>
      </div>
    )
  }

  // View mode - no prompt selected
  if (!prompt) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 p-4">
        <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
          <span className="text-lg">/</span>
        </div>
        <p className="text-sm">Select a prompt</p>
      </div>
    )
  }

  // View mode - prompt selected
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium bg-muted text-foreground">
              /
            </div>
            <span className="font-medium">{prompt.key}</span>
            <span className="text-xs text-muted-foreground">
              {prompt.queries.length} quer{prompt.queries.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-accent cursor-pointer"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Queries list */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-1">
          {prompt.queries.map((query, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/20 text-sm"
            >
              <span className="text-xs text-muted-foreground/60 w-4 text-center flex-shrink-0 pt-0.5">
                {index + 1}
              </span>
              <span className="flex-1 break-words">
                {query.text || (
                  <span className="text-muted-foreground/50 italic">Empty query</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Done button */}
      <div className="px-4 py-3 border-t border-border/10">
        <MacOSButton variant="default" size="sm" onClick={onSelect} className="w-full">
          Done
        </MacOSButton>
      </div>
    </div>
  )
}

export function PromptListModal({ isOpen, onClose, contact, onUpdate }: PromptListModalProps) {
  const [viewingPromptId, setViewingPromptId] = useState<string | undefined>()
  const [editingPrompt, setEditingPrompt] = useState<EditingPrompt | null>(null)

  const prompts = contact.shortcuts || []
  const allAgentIds = useMemo(() => contact.agents.map((a) => a.id), [contact.agents])

  // Current viewing prompt
  const viewingPrompt = editingPrompt ? undefined : prompts.find((p) => p.id === viewingPromptId)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setViewingPromptId(prompts[0]?.id)
      setEditingPrompt(null)
    } else {
      setEditingPrompt(null)
    }
  }, [isOpen])

  const handleViewPrompt = (prompt: Prompt) => {
    setViewingPromptId(prompt.id)
    setEditingPrompt(null)
  }

  const handleAddNew = () => {
    setEditingPrompt(createDefaultPrompt(allAgentIds))
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(promptToEditing(prompt, allAgentIds))
  }

  const handleDelete = async (prompt: Prompt) => {
    try {
      const confirmed = await ask(
        `Are you sure you want to delete "${prompt.key}"? This action cannot be undone.`,
        { title: 'Confirm Delete', kind: 'warning' },
      )

      if (!confirmed) return

      const updatedPrompts = prompts.filter((p) => p.id !== prompt.id)
      onUpdate(updatedPrompts)

      // Select another prompt or clear selection
      if (viewingPromptId === prompt.id) {
        setViewingPromptId(updatedPrompts[0]?.id)
      }
    } catch (error) {
      console.error('Delete confirmation error:', error)
    }
  }

  const handleSave = () => {
    if (!editingPrompt) return

    const sanitizedKey = editingPrompt.key.replace(/^\/+/, '/')
    const validQueries = editingPrompt.queries.filter((q) => q.text.trim())

    if (!sanitizedKey.trim() || validQueries.length === 0) return

    const isGroup = contact.type === 'group'

    if (editingPrompt.isNew) {
      // Create new prompt
      const newPrompt: Prompt = {
        id: Date.now().toString(),
        key: sanitizedKey,
        queries: validQueries.map((q) => ({
          ...q,
          agents: isGroup ? q.agents || [] : contact.agents.map((a) => a.id),
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      onUpdate([...prompts, newPrompt])
      setViewingPromptId(newPrompt.id)
    } else {
      // Update existing prompt
      const updatedPrompts = prompts.map((p) =>
        p.id === editingPrompt.id
          ? {
              ...p,
              key: sanitizedKey,
              queries: validQueries.map((q) => ({
                ...q,
                agents: isGroup ? q.agents || [] : contact.agents.map((a) => a.id),
              })),
              updatedAt: Date.now(),
            }
          : p,
      )
      onUpdate(updatedPrompts)
    }

    setEditingPrompt(null)
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
  }

  const handleEditingChange = (updates: Partial<EditingPrompt>) => {
    if (editingPrompt) {
      setEditingPrompt({ ...editingPrompt, ...updates })
    }
  }

  return (
    <MacOSSheet isOpen={isOpen} onClose={onClose} maxWidth="640px" height="480px">
      <MacOSSheetContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <h2 className="text-base font-semibold">Prompts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Prompt List (Left) */}
          <div className="w-[180px] border-r border-border/20 flex flex-col">
            <MacOSScrollArea className="flex-1 [&>div>div]:!block">
              <div className="py-0.5">
                {/* New prompt item (when editing) */}
                {editingPrompt?.isNew && (
                  <div className={cn('px-2 py-1.5 cursor-pointer overflow-hidden', 'bg-accent')}>
                    <div className="flex items-center gap-1.5 px-2">
                      <div className="w-3 h-3 flex-shrink-0">
                        <Plus className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium">New Prompt</span>
                    </div>
                  </div>
                )}
                {prompts.length === 0 && !editingPrompt?.isNew ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                    No prompts yet
                  </div>
                ) : (
                  prompts.map((prompt) => {
                    const isEditing =
                      editingPrompt && !editingPrompt.isNew && editingPrompt.id === prompt.id
                    const isViewing = viewingPromptId === prompt.id
                    return (
                      <div
                        key={prompt.id}
                        className={cn(
                          'px-2 py-1.5 cursor-pointer overflow-hidden',
                          'hover:bg-accent/50',
                          (isViewing || isEditing) && !editingPrompt?.isNew && 'bg-accent',
                        )}
                        onClick={() => handleViewPrompt(prompt)}
                      >
                        <div className="flex items-center gap-1.5 px-2 justify-between">
                          <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                            /{prompt.key}
                          </span>
                          <div className="w-3 h-3 flex-shrink-0">
                            {isEditing && <Pencil className="w-3 h-3 text-foreground" />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </MacOSScrollArea>

            {/* Add Prompt Button */}
            <div className="border-t border-border/20 p-2">
              <MacOSButton
                variant="ghost"
                size="sm"
                onClick={handleAddNew}
                disabled={editingPrompt?.isNew}
                className="w-full justify-start"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Prompt
              </MacOSButton>
            </div>
          </div>

          {/* Prompt Detail (Right) */}
          <PromptDetailPanel
            prompt={viewingPrompt}
            editingPrompt={editingPrompt}
            contact={contact}
            onSelect={onClose}
            onEdit={() => viewingPrompt && handleEdit(viewingPrompt)}
            onDelete={() => viewingPrompt && handleDelete(viewingPrompt)}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </MacOSSheetContent>
    </MacOSSheet>
  )
}

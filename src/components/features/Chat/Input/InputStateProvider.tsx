import React, { createContext, useContext, useState, useRef, useCallback, RefObject } from 'react'
import { useSession } from '../SessionProvider'
import { MediaUploadState, useMediaUpload } from './hooks/useMediaUpload'
import { QueryParams } from '@/lib/core/execution/types'
import { MediaItem } from '@/lib/core/messages/types'

// Staged query - before sending, doesn't have sessionId yet
export interface StagedQuery {
  id: string // temporary id for UI tracking
  agents: string[]
  text: string
  medias: MediaItem[]
}

// ==================== InputState Interface ====================
export interface InputState {
  inputValue: string
  setInputValue: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
  stagedQueries: StagedQuery[]
  isReadyToSend: boolean

  media: MediaUploadState

  // Mentioned agents state management
  mentionedAgentIds: string[]
  addMentionedAgent: (agentId: string) => void
  removeMentionedAgent: (agentId: string) => void
  setMentionedAgents: (agentIds: string[]) => void
  clearMentionedAgents: () => void

  stageQuery: () => void
  buildQueriesToSend: () => QueryParams[]
  loadStagedQueries: (queries: StagedQuery[]) => void
  removeStagedQuery: (index: number) => void
  updateStagedQuery: (index: number, updates: Partial<StagedQuery>) => void
  resetInput: () => void
}

// ==================== Context ====================
/**
 * InputStateContext provides the inputState to input-related hooks and components.
 * This is the foundational layer for input management.
 */
const InputStateContext = createContext<InputState | null>(null)

/**
 * Hook to access inputState from context
 * Used by useMention, usePromptSuggestion, and input components
 * @throws Error if used outside of InputStateProvider
 */
export function useInputStateContext(): InputState {
  const context = useContext(InputStateContext)
  if (!context) {
    throw new Error('useInputStateContext must be used within InputStateProvider')
  }
  return context
}

interface InputStateProviderProps {
  children: React.ReactNode
}

/**
 * InputStateProvider manages the core input state including:
 * - Input value
 * - Staged messages
 * - Mentioned agents
 * - Media uploads
 *
 * This is the base layer that other input-related providers build upon.
 *
 * @requires session - Must be used within a valid SessionProvider context where session exists
 * @throws Error if session is null/undefined
 */
export function InputStateProvider({ children }: InputStateProviderProps) {
  const { session, contact } = useSession()

  // Ensure session exists - this provider should only be used when session is available
  if (!session) {
    throw new Error(
      'InputStateProvider requires a valid session. Ensure it is only rendered when session exists.',
    )
  }

  // Ensure contact exists - contact should be loaded when session exists
  if (!contact) {
    throw new Error(
      'InputStateProvider requires a valid contact. Contact data must be available for the session.',
    )
  }

  // ==================== State ====================
  const [inputValue, setInputValue] = useState('')
  const [stagedQueries, setStagedQueries] = useState<StagedQuery[]>([])
  const [mentionedAgentIds, setMentionedAgentIds] = useState<string[]>([])

  const contactAgents = contact.agents ?? []

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const media = useMediaUpload()

  const hasCurrentContent = !!(inputValue.trim() || media.selectedMedia)
  const hasStagedContent = stagedQueries.length > 0

  // ==================== Mentioned Agents Management ====================
  const addMentionedAgent = useCallback(
    (agentId: string) => {
      setMentionedAgentIds((prev) => {
        // Handle @all special case
        if (agentId === '@all') {
          return contactAgents.map((agent) => agent.id)
        }
        // Don't add duplicate
        if (prev.includes(agentId)) return prev
        return [...prev, agentId]
      })
    },
    [contactAgents],
  )

  const removeMentionedAgent = useCallback((agentId: string) => {
    setMentionedAgentIds((prev) => prev.filter((id) => id !== agentId))
  }, [])

  const setMentionedAgents = useCallback((agentIds: string[]) => {
    setMentionedAgentIds(agentIds)
  }, [])

  const clearMentionedAgents = useCallback(() => {
    setMentionedAgentIds([])
  }, [])

  // ==================== Query Management ====================
  const createStagedQuery = useCallback((): StagedQuery => {
    const medias: MediaItem[] = []

    if (media.selectedMedia) {
      medias.push({
        type: 'media',
        media: media.selectedMedia,
      } as MediaItem)
    }

    return {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      agents: contact && contact.type === 'agent' ? [session.contactId] : mentionedAgentIds,
      medias,
    }
  }, [inputValue, media.selectedMedia, mentionedAgentIds, session.contactId, contact])

  const stageQuery = useCallback(() => {
    const hasCurrentContent = !!(inputValue.trim() || media.selectedMedia)
    if (!hasCurrentContent) return

    const query = createStagedQuery()
    setStagedQueries((prev) => [...prev, query])
    setInputValue('')
    media.resetMedia()
    clearMentionedAgents()
  }, [inputValue, media, createStagedQuery, clearMentionedAgents])

  const removeStagedQuery = useCallback((index: number) => {
    setStagedQueries((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateStagedQuery = useCallback((index: number, updates: Partial<StagedQuery>) => {
    setStagedQueries((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)))
  }, [])

  const resetInput = useCallback(() => {
    setStagedQueries([])
    setInputValue('')
    media.resetMedia()
    clearMentionedAgents()
  }, [media, clearMentionedAgents])

  const loadStagedQueries = useCallback((queries: StagedQuery[]) => {
    setStagedQueries(queries)
  }, [])

  const buildQueriesToSend = useCallback((): QueryParams[] => {
    const queriesToSend: QueryParams[] = []

    // Convert staged queries to QueryParams
    for (const staged of stagedQueries) {
      queriesToSend.push({
        sessionId: session.id,
        agents: staged.agents,
        text: staged.text,
        medias: staged.medias,
      })
    }

    // Add current input if has content
    if (hasCurrentContent) {
      const current = createStagedQuery()
      queriesToSend.push({
        sessionId: session.id,
        agents: current.agents,
        text: current.text,
        medias: current.medias,
      })
    }

    return queriesToSend
  }, [hasCurrentContent, stagedQueries, createStagedQuery, session.id])

  // ==================== Build Context Value ====================
  const inputState: InputState = {
    media,
    inputValue,
    setInputValue,
    isReadyToSend: hasCurrentContent || hasStagedContent,
    textareaRef,
    mentionedAgentIds,
    addMentionedAgent,
    removeMentionedAgent,
    setMentionedAgents,
    clearMentionedAgents,
    stageQuery,
    stagedQueries,
    loadStagedQueries,
    removeStagedQuery,
    updateStagedQuery,
    resetInput,
    buildQueriesToSend,
  }

  return <InputStateContext.Provider value={inputState}>{children}</InputStateContext.Provider>
}

import { useState, useCallback } from 'react'
import type { Agent } from '@/lib/core/agent/types'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useInputStateContext } from '../InputStateProvider'

/**
 * useMention manages mention functionality (@agent suggestions)
 * Gets dependencies from context instead of parameters
 *
 * @requires session - Must be used within a valid SessionProvider context where session exists
 * @requires contact - Must be used within a valid SessionProvider context where contact exists
 * @requires InputStateProvider - Must be used within InputStateProvider
 */
export function useMention() {
  const { session, contact } = useSession()
  const inputState = useInputStateContext()

  if (!session) {
    throw new Error('useMention requires a valid session.')
  }

  if (!contact) {
    throw new Error('useMention requires a valid contact.')
  }

  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)

  // Filter agents based on mention query, and include @all option
  const filteredMentionAgents = (() => {
    const filtered = mentionQuery
      ? contact.agents.filter(
          (agent) => agent && agent.alias.toLowerCase().includes(mentionQuery.toLowerCase()),
        )
      : contact.agents

    // Add @all option if we have agents and (no query or "all" matches the query)
    if (
      contact.agents.length > 1 &&
      (!mentionQuery || 'all'.includes(mentionQuery.toLowerCase()))
    ) {
      const allMembersOption: Agent = {
        id: '@all',
        alias: 'all',
        pinned: false,
        description: 'All group members',
        llm: {
          providerId: '',
          modelId: '',
        },
        prompt: {
          systemPrompt: '',
          shortcuts: [],
        },
        extension: {
          mcpServers: [],
          skipPermission: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      return [allMembersOption, ...filtered]
    }

    return filtered
  })()

  const insertMention = useCallback(
    (agent: Agent) => {
      // Remove the @ trigger text from input
      const beforeMention = inputState.inputValue.substring(0, mentionPosition)
      const afterMention = inputState.inputValue.substring(
        mentionPosition + mentionQuery.length + 1,
      )
      // Don't insert @agent text, just remove the trigger and keep the rest
      const newValue = `${beforeMention}${afterMention}`.trim()

      inputState.setInputValue(newValue)

      // Add agent to state
      inputState.addMentionedAgent(agent.id)

      setShowMentionSuggestions(false)
      setMentionQuery('')

      // Focus back to textarea
      setTimeout(() => {
        if (inputState.textareaRef.current) {
          const newCursorPosition = beforeMention.length
          inputState.textareaRef.current.focus()
          inputState.textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }, 0)
    },
    [inputState, mentionPosition, mentionQuery],
  )

  const handleMentionButtonClick = useCallback(() => {
    if (contact && contact.agents.length > 0) {
      if (showMentionSuggestions) {
        setShowMentionSuggestions(false)
        setMentionQuery('')
      } else {
        setShowMentionSuggestions(true)
        setMentionQuery('')
        setSelectedMentionIndex(0)
      }
    }
  }, [contact, showMentionSuggestions])

  const checkForMention = useCallback(
    (textBeforeCursor: string) => {
      if (contact && contact.agents.length > 0) {
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

        if (mentionMatch) {
          setMentionQuery(mentionMatch[1])
          setMentionPosition(mentionMatch.index || 0)
          setShowMentionSuggestions(true)
          setSelectedMentionIndex(0)
          return true
        }
      }

      if (!textBeforeCursor.match(/@(\w*)$/)) {
        setShowMentionSuggestions(false)
        setMentionQuery('')
      }
      return false
    },
    [contact],
  )

  const handleMentionKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showMentionSuggestions || filteredMentionAgents.length === 0) {
        return false
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev < filteredMentionAgents.length - 1 ? prev + 1 : 0))
        return true
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : filteredMentionAgents.length - 1))
        return true
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMentionAgents[selectedMentionIndex]!)
        return true
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionSuggestions(false)
        setMentionQuery('')
        return true
      }

      return false
    },
    [showMentionSuggestions, filteredMentionAgents, selectedMentionIndex, insertMention],
  )

  const resetMention = useCallback(() => {
    setShowMentionSuggestions(false)
    setMentionQuery('')
    setSelectedMentionIndex(0)
  }, [])

  return {
    // State
    showMentionSuggestions,
    selectedMentionIndex,
    filteredMentionAgents,

    // Actions
    insertMention,
    handleMentionButtonClick,
    checkForMention,
    handleMentionKeyPress,
    resetMention,
  }
}

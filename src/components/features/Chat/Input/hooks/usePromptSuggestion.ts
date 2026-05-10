import { useState, useCallback } from 'react'
import { Prompt } from '@/lib/core/agent/types'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useInputStateContext } from '../InputStateProvider'

/**
 * usePromptSuggestion manages prompt/shortcut suggestions (/ commands)
 * Gets dependencies from context instead of parameters
 *
 * @requires session - Must be used within a valid SessionProvider context where session exists
 * @requires contact - Must be used within a valid SessionProvider context where contact exists
 * @requires InputStateProvider - Must be used within InputStateProvider
 */
export function usePromptSuggestion() {
  const { session, contact } = useSession()
  const inputState = useInputStateContext()

  if (!session) {
    throw new Error('usePromptSuggestion requires a valid session.')
  }

  if (!contact) {
    throw new Error('usePromptSuggestion requires a valid contact.')
  }

  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false)
  const [promptQuery, setPromptQuery] = useState('')
  const [promptPosition, setPromptPosition] = useState(0)
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0)

  let prompts: Prompt[] = contact?.shortcuts ?? []
  if (promptQuery && promptQuery.trim() !== '') {
    const normalizedQuery = promptQuery.trim().toLowerCase()
    prompts = prompts.filter((prompt) => {
      const keyMatch = prompt.key.toLowerCase().includes(normalizedQuery)
      const descriptionMatch = prompt.description?.toLowerCase().includes(normalizedQuery)
      return keyMatch || descriptionMatch
    })
  }

  const insertPrompt = useCallback(
    (prompt: Prompt) => {
      const beforePrompt = inputState.inputValue.substring(0, promptPosition)
      const afterPrompt = inputState.inputValue.substring(promptPosition + promptQuery.length + 1)

      if (prompt.queries.length === 1) {
        // Single query: load to input box
        const newValue = `${beforePrompt}${prompt.queries[0].text}${afterPrompt}`
        inputState.setInputValue(newValue)
        setShowPromptSuggestions(false)
        setPromptQuery('')

        // Focus back to textarea
        setTimeout(() => {
          if (inputState.textareaRef.current) {
            const newCursorPosition = beforePrompt.length + prompt.queries[0].text.length
            inputState.textareaRef.current.focus()
            inputState.textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          }
        }, 0)
      } else {
        // Multiple queries: convert QueryParams[] to StagedQuery[] and load
        const stagedQueries = prompt.queries.map((q) => ({
          id: crypto.randomUUID(),
          agents: q.agents,
          text: q.text,
          medias: q.medias ?? [],
        }))
        inputState.loadStagedQueries(stagedQueries)
        setShowPromptSuggestions(false)
        setPromptQuery('')

        // Clear the prompt trigger from input
        inputState.setInputValue(beforePrompt + afterPrompt)

        // Focus back to textarea
        setTimeout(() => {
          inputState.textareaRef.current?.focus()
        }, 0)
      }
    },
    [inputState, promptPosition, promptQuery],
  )

  const handlePromptButtonClick = useCallback(() => {
    if (showPromptSuggestions) {
      setShowPromptSuggestions(false)
      setPromptQuery('')
    } else {
      setShowPromptSuggestions(true)
      setPromptQuery('')
      setSelectedPromptIndex(0)
    }
  }, [showPromptSuggestions])

  const checkForPrompt = useCallback((textBeforeCursor: string) => {
    const promptMatch = textBeforeCursor.match(/\/(\w*)$/)
    if (promptMatch) {
      setPromptQuery(promptMatch[1])
      setPromptPosition(promptMatch.index || 0)
      setShowPromptSuggestions(true)
      setSelectedPromptIndex(0)
      return true
    } else {
      setShowPromptSuggestions(false)
      setPromptQuery('')
      return false
    }
  }, [])

  const handlePromptKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showPromptSuggestions || prompts.length === 0) {
        return false
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedPromptIndex((prev) => (prev < prompts.length - 1 ? prev + 1 : 0))
        return true
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedPromptIndex((prev) => (prev > 0 ? prev - 1 : prompts.length - 1))
        return true
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertPrompt(prompts[selectedPromptIndex])
        return true
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowPromptSuggestions(false)
        setPromptQuery('')
        return true
      }

      return false
    },
    [showPromptSuggestions, prompts, selectedPromptIndex, insertPrompt],
  )

  const resetPrompt = useCallback(() => {
    setShowPromptSuggestions(false)
    setPromptQuery('')
    setSelectedPromptIndex(0)
  }, [])

  return {
    // State
    showPromptSuggestions,
    promptQuery,
    selectedPromptIndex,
    prompts,

    // Actions
    insertPrompt,
    handlePromptButtonClick,
    checkForPrompt,
    handlePromptKeyPress,
    resetPrompt,

    // Setters for external control
    setShowPromptSuggestions,
    setPromptQuery,
  }
}

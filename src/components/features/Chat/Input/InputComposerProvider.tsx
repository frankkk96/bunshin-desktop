import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { useMention } from './hooks/useMention'
import { usePromptSuggestion } from './hooks/usePromptSuggestion'
import { useInputStateContext, type InputState } from './InputStateProvider'

/**
 * InputComposer combines all input-related functionality:
 * - input: Base input state (from InputStateProvider)
 * - mention: @mention suggestions
 * - prompt: /prompt suggestions
 */
export interface InputComposer {
  input: InputState
  mention: ReturnType<typeof useMention>
  prompt: ReturnType<typeof usePromptSuggestion>
  reset: () => void
}

const InputComposerContext = createContext<InputComposer | null>(null)

/**
 * Hook to access the input composer from context
 * Used by components like InputBar, MessageTextarea, etc.
 * @throws Error if used outside of InputComposerProvider
 */
export function useInputComposerContext(): InputComposer {
  const composer = useContext(InputComposerContext)
  if (!composer) {
    throw new Error('useInputComposerContext must be used within InputComposerProvider')
  }
  return composer
}

interface InputComposerProviderProps {
  children: React.ReactNode
}

/**
 * InputComposerProvider composes mention and prompt functionality on top of InputState.
 *
 * Layer structure:
 * 1. InputStateProvider (base layer) - manages input value, staged messages, media
 * 2. InputComposerProvider (this layer) - adds mention & prompt suggestions
 *
 * Dependencies:
 * - Requires InputStateProvider to be a parent provider
 * - useMention and usePromptSuggestion get inputState via useInputStateContext()
 */
export function InputComposerProvider({ children }: InputComposerProviderProps) {
  const inputState = useInputStateContext()
  const mention = useMention()
  const prompt = usePromptSuggestion()

  const reset = useCallback(() => {
    inputState.resetInput()
    mention.resetMention()
    prompt.resetPrompt()
  }, [inputState, mention, prompt])

  const composer: InputComposer = useMemo(
    () => ({
      input: inputState,
      mention,
      prompt,
      reset,
    }),
    [inputState, mention, prompt, reset],
  )

  return <InputComposerContext.Provider value={composer}>{children}</InputComposerContext.Provider>
}


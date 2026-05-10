import { useCallback } from 'react'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'
import { useInputComposerContext } from '../InputComposerProvider'

interface MessageTextareaProps {
  placeholder?: string
  rows?: number
}

export function MessageTextarea({ placeholder = 'Message', rows = 2 }: MessageTextareaProps) {
  const { session } = useSession()
  const { send } = useSessionActions(session?.id)
  const { input, mention, prompt, reset } = useInputComposerContext()

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      input.setInputValue(newValue)

      // Get cursor position and check for mention or prompt
      const cursorPosition = e.target.selectionStart
      const textBeforeCursor = newValue.substring(0, cursorPosition)

      // Check for mention
      const mentionFound = mention.checkForMention(textBeforeCursor)

      // Check for prompt if no mention
      if (!mentionFound) {
        prompt.checkForPrompt(textBeforeCursor)
      }
    },
    [input, mention, prompt],
  )

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Let mention/prompt handle their own keys first
      if (mention.handleMentionKeyPress(e) || prompt.handlePromptKeyPress(e)) {
        return
      }

      // Handle Cmd+Enter (macOS) or Ctrl+Enter (Windows/Linux) to stage query
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        input.stageQuery()
        return
      }

      // Handle Enter key to send queries
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const queries = input.buildQueriesToSend()
        send(queries)
        reset()
      }
    },
    [input, mention, prompt, reset, send],
  )

  return (
    <textarea
      ref={input.textareaRef}
      value={input.inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyPress}
      placeholder={placeholder}
      rows={rows}
      className="w-full border-none bg-transparent text-sm outline-none font-inherit resize-none pb-10 pr-12 min-h-[30px] max-h-[120px] leading-snug text-foreground mb-6"
      style={{
        overflow: input.inputValue.split('\n').length > 5 ? 'auto' : 'hidden',
      }}
    />
  )
}

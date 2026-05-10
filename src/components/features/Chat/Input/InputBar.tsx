import { IoArrowUpCircle, IoAddCircleOutline } from 'react-icons/io5'
import { cn } from '@/lib/ui/utils'
import { IconButton } from '@/components/common'
import { MacOSTooltip, MacOSTooltipContent, MacOSTooltipTrigger } from '@/components/ui'
import { MentionSuggestions } from './components/MentionSuggestions'
import { PromptSuggestions } from './components/PromptSuggestions'
import { MediaPreview } from './components/MediaPreview'
import { AttachmentButtons } from './components/AttachmentButtons'
import { MessageTextarea } from './components/MessageTextarea'
import { StagedMessages } from './components/StagedMessages'
import { MentionedAgents } from './components/MentionedAgents'
import { useSession } from '@/components/features/Chat/SessionProvider'
import { useSessionActions } from '@/hooks/sessions/useSessionActions'
import { useInputComposerContext } from './InputComposerProvider'
import { useCallback } from 'react'
import { useInputStateContext } from './InputStateProvider'

export function InputBar() {
  const { session } = useSession()
  const { send } = useSessionActions(session?.id)
  const { buildQueriesToSend, stageQuery, inputValue, isReadyToSend } = useInputStateContext()
  const { input, mention, prompt, reset } = useInputComposerContext()

  const handleSend = useCallback(() => {
    const queries = buildQueriesToSend()
    send(queries)
    reset()
  }, [buildQueriesToSend, send, reset])

  return (
    <div className={cn('p-3 px-4 relative bg-background')}>
      {mention.showMentionSuggestions && <MentionSuggestions />}
      {prompt.showPromptSuggestions && <PromptSuggestions />}
      <StagedMessages />
      <div className="flex justify-center">
        <div className="relative rounded-xl border p-3 min-h-[80px] w-full bg-input border-border">
          {input.media.selectedMedia && (
            <div className="mb-2">
              <MediaPreview media={input.media.selectedMedia} onRemove={input.media.removeMedia} />
            </div>
          )}
          <MentionedAgents />
          <MessageTextarea placeholder="Ask me anything..." rows={2} />
          <AttachmentButtons />
          <div className="absolute bottom-1 right-1 flex gap-1">
            <MacOSTooltip>
              <MacOSTooltipTrigger asChild>
                <div>
                  <IconButton onClick={stageQuery} disabled={!inputValue.trim()}>
                    <IoAddCircleOutline
                      size={32}
                      className={!inputValue.trim() ? 'text-muted-foreground' : 'text-foreground'}
                    />
                  </IconButton>
                </div>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="top" sideOffset={8}>
                Stage message (⌘+Enter)
              </MacOSTooltipContent>
            </MacOSTooltip>

            <MacOSTooltip>
              <MacOSTooltipTrigger asChild>
                <div>
                  <IconButton onClick={handleSend} disabled={!isReadyToSend}>
                    <IoArrowUpCircle
                      size={32}
                      className={!isReadyToSend ? 'text-muted-foreground' : 'text-foreground'}
                    />
                  </IconButton>
                </div>
              </MacOSTooltipTrigger>
              <MacOSTooltipContent side="top" sideOffset={8}>
                Send message (Enter)
              </MacOSTooltipContent>
            </MacOSTooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

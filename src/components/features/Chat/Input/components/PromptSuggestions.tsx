import { Prompt } from '@/lib/core/agent/types'
import { MacOSScrollArea } from '@/components/ui'
import { useInputComposerContext } from '../InputComposerProvider'

export function PromptSuggestions() {
  const { prompt } = useInputComposerContext()
  const { prompts, selectedPromptIndex, insertPrompt } = prompt

  if (prompts.length === 0) return null

  // Calculate dynamic height based on item count (max 4 items, each ~40px)
  const itemHeight = 40
  const maxItems = 4
  const actualItems = Math.min(prompts.length, maxItems)
  const dynamicHeight = actualItems * itemHeight

  return (
    <div className="absolute bottom-full left-3 right-3 mb-1 backdrop-blur-sm border border-border/20 rounded-lg shadow-lg z-50 bg-popover">
      <MacOSScrollArea className={`h-[${dynamicHeight}px]`}>
        {prompts.map((prompt: Prompt, index: number) => (
          <div
            key={prompt.id}
            className={`flex items-center gap-2 px-3 py-1 cursor-pointer first:rounded-t-lg last:rounded-b-lg ${
              index === selectedPromptIndex ? 'shadow-sm bg-muted' : ''
            }`}
            onClick={() => insertPrompt(prompt)}
            onMouseEnter={(e) => {
              if (index === selectedPromptIndex) {
                e.currentTarget.classList.add('bg-muted/80')
              } else {
                e.currentTarget.classList.add('bg-muted/50')
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.classList.remove('bg-muted/80', 'bg-muted/50')
            }}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium bg-muted text-foreground">
              /
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-18 flex-shrink-0">
                <span className="font-medium text-sm text-foreground truncate">{prompt.key}</span>
                {prompt.queries.length > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500 text-white flex-shrink-0">
                    {prompt.queries.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate flex-1">
                {prompt.queries[0]?.text || ''}
              </span>
            </div>
            {index === selectedPromptIndex && (
              <div className="text-xs opacity-50 text-muted-foreground flex-shrink-0">↵</div>
            )}
          </div>
        ))}
      </MacOSScrollArea>
    </div>
  )
}

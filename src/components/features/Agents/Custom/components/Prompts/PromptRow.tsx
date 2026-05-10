import { Prompt } from '@/lib/core/agent/types'
import { ChevronRight } from 'lucide-react'

interface PromptRowProps {
  prompt: Prompt
  onEdit: (prompt: Prompt) => void
}

export function PromptRow({ prompt, onEdit }: PromptRowProps) {
  const previewText = prompt.queries.length > 0 ? prompt.queries[0].text : 'No queries'

  return (
    <div
      onClick={() => onEdit(prompt)}
      className="w-full flex items-center gap-2 px-3 py-1 bg-transparent hover:bg-accent rounded group cursor-default"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium bg-muted text-foreground">
        /
      </div>

      {/* Prompt Info - Single Line */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-medium text-sm text-foreground">{prompt.key}</span>
          {prompt.queries.length > 1 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500 text-white">
              {prompt.queries.length}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate flex-1">{previewText}</span>
      </div>

      {/* Edit Button */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0" />
    </div>
  )
}

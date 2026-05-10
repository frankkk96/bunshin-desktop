import { memo, useState } from 'react'

interface CollapsibleSectionProps {
  label: string
  text: string
}

export const CollapsibleSection = memo(function CollapsibleSection({
  label,
  text,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldCollapse = text.length > 200
  const displayText = shouldCollapse && !isExpanded ? text.substring(0, 200) : text

  return (
    <div className="bg-muted/50 text-muted-foreground border border-border p-3 rounded-xl text-xs italic opacity-85 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">
        {label}
      </div>
      <div className="whitespace-pre-wrap leading-relaxed">
        {displayText}
        {shouldCollapse && !isExpanded && <span className="opacity-70 ml-0.5">...</span>}
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 px-3 py-1 bg-background/50 border border-border rounded-md text-xs hover:bg-background"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
})

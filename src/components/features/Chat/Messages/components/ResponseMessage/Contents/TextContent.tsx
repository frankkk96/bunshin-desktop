import { memo } from 'react'
import { MarkdownRenderer } from '../../Shared/MarkdownRenderer'

interface TextContentProps {
  content: string
}

export const TextContent = memo(function TextContent({ content }: TextContentProps) {
  if (!content) {
    return null
  }

  return (
    <div className="text-base select-text">
      <MarkdownRenderer content={content} />
    </div>
  )
})

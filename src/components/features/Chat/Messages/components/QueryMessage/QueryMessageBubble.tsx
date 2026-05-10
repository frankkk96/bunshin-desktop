interface QueryMessageBubbleProps {
  content: string
}

export function QueryMessageBubble({ content }: QueryMessageBubbleProps) {
  return (
    <div className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2.5 rounded-[20px] rounded-br-md max-w-[75%] break-words text-base leading-relaxed select-text shadow-sm whitespace-pre-wrap">
      {content}
    </div>
  )
}

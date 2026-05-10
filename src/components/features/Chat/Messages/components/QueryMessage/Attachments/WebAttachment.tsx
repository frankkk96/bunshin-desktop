interface WebAttachmentProps {
  url: string
  title?: string
}

export function WebAttachment({ url, title }: WebAttachmentProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer min-w-[140px] max-w-sm hover:bg-muted/50 hover:-translate-y-px duration-200">
      <div className="text-lg flex-shrink-0">🌐</div>
      <div className="flex-1 text-xs text-foreground truncate">{title || url}</div>
    </div>
  )
}

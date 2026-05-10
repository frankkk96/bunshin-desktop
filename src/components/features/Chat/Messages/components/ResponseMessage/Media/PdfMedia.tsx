import { useCallback } from 'react'
import { mediaApi } from '@/lib/tauri/service/media'
import { MediaItem } from '@/lib/core/messages/types'

interface PdfMediaProps {
  item: MediaItem
}

export function PdfMedia({ item }: PdfMediaProps) {
  const handleClick = useCallback(async () => {
    if (item.media.localPath) {
      await mediaApi.openFile(item.media.localPath)
    }
  }, [item.media.localPath])

  return (
    <div
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer min-w-[140px] max-w-xs hover:bg-muted/50 transition-colors"
    >
      <div className="text-red-500 text-xl flex-shrink-0">📄</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{item.media.name}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">PDF Document</div>
      </div>
    </div>
  )
}

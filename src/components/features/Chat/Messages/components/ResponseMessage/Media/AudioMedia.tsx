import { useCallback } from 'react'
import { CachedAudio } from '@/components/common/Media'
import { mediaApi } from '@/lib/tauri/service/media'
import { ExternalLink } from 'lucide-react'
import { MediaItem } from '@/lib/core/messages/types'

interface AudioMediaProps {
  item: MediaItem
}

export function AudioMedia({ item }: AudioMediaProps) {
  const handleOpenExternal = useCallback(async () => {
    if (item.media.localPath) {
      await mediaApi.openFile(item.media.localPath)
    }
  }, [item.media.localPath])

  return (
    <div className="w-80">
      <div className="relative group">
        <CachedAudio src={item.media.localPath} className="w-full" preload="metadata" />
        <button
          onClick={handleOpenExternal}
          className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          title="Open in external player"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
      {item.media.name && (
        <div className="text-xs text-gray-500 mt-1 truncate">{item.media.name}</div>
      )}
    </div>
  )
}

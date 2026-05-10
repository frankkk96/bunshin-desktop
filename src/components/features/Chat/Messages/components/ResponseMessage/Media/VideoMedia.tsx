import { useCallback } from 'react'
import { CachedVideo } from '@/components/common/Media'
import { mediaApi } from '@/lib/tauri/service/media'
import { ExternalLink } from 'lucide-react'
import { MediaItem } from '@/lib/core/messages/types'

interface VideoMediaProps {
  item: MediaItem
}

export function VideoMedia({ item }: VideoMediaProps) {
  const handleOpenExternal = useCallback(async () => {
    if (item.media.localPath) {
      await mediaApi.openFile(item.media.localPath)
    }
  }, [item.media.localPath])

  return (
    <div className="flex flex-col gap-1.5 max-w-md">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 group">
        <CachedVideo
          src={item.media.localPath}
          className="block w-full h-auto max-h-96 bg-black"
          preload="auto"
          muted
          autoPlay={false}
        />
        <button
          onClick={handleOpenExternal}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          title="Open in external player"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
      {item.media.name && <div className="text-xs text-gray-500 truncate">{item.media.name}</div>}
    </div>
  )
}

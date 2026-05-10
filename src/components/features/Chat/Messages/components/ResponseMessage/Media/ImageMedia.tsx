import { useCallback } from 'react'
import { CachedImage } from '@/components/common/Images/CachedImage'
import { mediaApi } from '@/lib/tauri/service/media'
import { MediaItem } from '@/lib/core/messages/types'

interface ImageMediaProps {
  item: MediaItem
}

export function ImageMedia({ item }: ImageMediaProps) {
  const handleClick = useCallback(async () => {
    if (item.media.localPath) {
      await mediaApi.openFile(item.media.localPath)
    }
  }, [item.media.localPath])

  return (
    <div className="flex flex-col gap-1.5 max-w-md">
      <div onClick={handleClick} className="cursor-pointer">
        <CachedImage
          src={item.media.localPath}
          alt={item.media.name || 'Agent generated image'}
          className="rounded-2xl max-w-full max-h-96 object-contain shadow-md hover:opacity-90 transition-opacity"
        />
      </div>
    </div>
  )
}

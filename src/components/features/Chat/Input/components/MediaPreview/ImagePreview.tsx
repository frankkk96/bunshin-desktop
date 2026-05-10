import { useMemo, useCallback } from 'react'
import { IoCloseCircle } from 'react-icons/io5'
import { convertFileSrc } from '@tauri-apps/api/core'
import { CachedImage } from '@/components/common/Images/CachedImage'
import { mediaApi, Media } from '@/lib/tauri/service/media'

interface ImagePreviewProps {
  media: Media
  onRemove?: () => void
}

export function ImagePreview({ media, onRemove }: ImagePreviewProps) {
  const previewUrl = useMemo(() => {
    try {
      return convertFileSrc(media.localPath)
    } catch {
      return media.localPath || ''
    }
  }, [media.localPath])

  const handleClick = useCallback(async () => {
    if (media.localPath) {
      await mediaApi.openFile(media.localPath)
    }
  }, [media.localPath])

  return (
    <div className="relative inline-block">
      {previewUrl ? (
        <div onClick={handleClick} className="cursor-pointer">
          <CachedImage
            src={previewUrl}
            alt={media.name}
            className="w-16 h-16 object-cover rounded-lg hover:opacity-90 transition-opacity"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          Loading...
        </div>
      )}
      {onRemove && (
        <IoCloseCircle
          size={24}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-0 -right-0 p-0 translate-x-1/2 -translate-y-1/2 hover:cursor-pointer hover:text-red-500 hover:scale-110"
        />
      )}
    </div>
  )
}

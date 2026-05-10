import { useCallback, useMemo } from 'react'
import { IoCloseCircle, IoVideocamOutline } from 'react-icons/io5'
import { convertFileSrc } from '@tauri-apps/api/core'
import { mediaApi, Media } from '@/lib/tauri/service/media'

interface VideoPreviewProps {
  media: Media
  onRemove?: () => void
}

export function VideoPreview({ media, onRemove }: VideoPreviewProps) {
  const videoUrl = useMemo(() => {
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
      {videoUrl ? (
        <div className="relative group">
          <video
            src={videoUrl}
            className="w-24 h-16 object-cover rounded-lg cursor-pointer"
            onClick={handleClick}
            muted
          />
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleClick}
          >
            <IoVideocamOutline size={24} className="text-white" />
          </div>
        </div>
      ) : (
        <div className="w-24 h-16 rounded-lg flex items-center justify-center text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          <IoVideocamOutline size={20} />
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

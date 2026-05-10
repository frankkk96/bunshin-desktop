import { useCallback } from 'react'
import { IoCloseCircle, IoMusicalNotesOutline } from 'react-icons/io5'
import { mediaApi, Media } from '@/lib/tauri/service/media'

interface AudioPreviewProps {
  media: Media
  onRemove?: () => void
}

export function AudioPreview({ media, onRemove }: AudioPreviewProps) {
  const handleClick = useCallback(async () => {
    if (media.localPath) {
      await mediaApi.openFile(media.localPath)
    }
  }, [media.localPath])

  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[200px]">
      <IoMusicalNotesOutline size={20} className="text-purple-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium truncate text-slate-900 dark:text-slate-100 cursor-pointer hover:underline"
          onClick={handleClick}
        >
          {media.name}
        </div>
      </div>
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

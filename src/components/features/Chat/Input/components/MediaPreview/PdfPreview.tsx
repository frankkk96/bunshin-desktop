import { useCallback } from 'react'
import { IoCloseCircle, IoDocumentTextOutline } from 'react-icons/io5'
import { mediaApi, Media } from '@/lib/tauri/service/media'

interface PdfPreviewProps {
  media: Media
  onRemove?: () => void
}

export function PdfPreview({ media, onRemove }: PdfPreviewProps) {
  const handleClick = useCallback(async () => {
    if (media.localPath) {
      await mediaApi.openFile(media.localPath)
    }
  }, [media.localPath])

  return (
    <div
      className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[140px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      onClick={handleClick}
    >
      <IoDocumentTextOutline size={20} className="text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
          {media.name}
        </div>
        <div className="text-[10px] leading-tight text-slate-600 dark:text-slate-400">
          PDF Document
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

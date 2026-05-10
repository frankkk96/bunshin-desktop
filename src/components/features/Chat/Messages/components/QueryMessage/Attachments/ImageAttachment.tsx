import { useCallback } from 'react'
import { CachedImage } from '@/components/common/Images/CachedImage'
import { mediaApi } from '@/lib/tauri/service/media'

interface ImageAttachmentProps {
  localPath: string
  name?: string
}

export function ImageAttachment({ localPath, name }: ImageAttachmentProps) {
  const handleClick = useCallback(async () => {
    if (localPath) {
      await mediaApi.openFile(localPath)
    }
  }, [localPath])

  return (
    <div className="flex flex-col gap-1.5 max-w-md w-fit">
      <div onClick={handleClick} className="cursor-pointer">
        <CachedImage
          src={localPath}
          alt={name || 'uploaded image'}
          className="rounded-2xl max-w-full max-h-96 object-contain shadow-sm hover:scale-[1.02] transition-transform duration-200"
        />
      </div>
      {name && (
        <div className="text-xs text-muted-foreground opacity-80 mt-0.5 max-w-full truncate">
          {name}
        </div>
      )}
    </div>
  )
}

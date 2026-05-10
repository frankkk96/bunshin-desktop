import { Media } from '@/lib/tauri/service/media'
import { ImagePreview } from './ImagePreview'
import { AudioPreview } from './AudioPreview'
import { VideoPreview } from './VideoPreview'
import { PdfPreview } from './PdfPreview'

interface MediaPreviewProps {
  media: Media
  onRemove?: () => void
}

export function MediaPreview({ media, onRemove }: MediaPreviewProps) {
  switch (media.type) {
    case 'image':
      return <ImagePreview media={media} onRemove={onRemove} />
    case 'video':
      return <VideoPreview media={media} onRemove={onRemove} />
    case 'audio':
      return <AudioPreview media={media} onRemove={onRemove} />
    case 'pdf':
    default:
      return <PdfPreview media={media} onRemove={onRemove} />
  }
}

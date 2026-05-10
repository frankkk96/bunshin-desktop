import { ImageMedia } from './ImageMedia'
import { VideoMedia } from './VideoMedia'
import { AudioMedia } from './AudioMedia'
import { PdfMedia } from './PdfMedia'
import { WebMedia } from './WebMedia'
import { MediaItem } from '@/lib/core/messages/types'

interface MediaRendererProps {
  item: MediaItem
}

export function MediaRenderer({ item }: MediaRendererProps) {
  switch (item.media.type) {
    case 'image':
      return <ImageMedia item={item} />
    case 'video':
      return <VideoMedia item={item} />
    case 'audio':
      return <AudioMedia item={item} />
    case 'pdf':
      return <PdfMedia item={item} />
    case 'web':
      return <WebMedia item={item} />
    default:
      return null
  }
}

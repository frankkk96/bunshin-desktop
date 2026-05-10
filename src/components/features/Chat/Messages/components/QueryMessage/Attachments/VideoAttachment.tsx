import { useMemo } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface VideoAttachmentProps {
  localPath: string
  name?: string
}

function resolveMediaUrl(url: string | undefined): string {
  if (!url) return ''

  const normalizedUrl = url.trim()

  if (!normalizedUrl) return ''

  if (/^(https?:|data:|tauri:\/\/|asset:\/\/)/i.test(normalizedUrl)) {
    return normalizedUrl
  }

  if (normalizedUrl.startsWith('file://')) {
    try {
      return convertFileSrc(normalizedUrl.replace('file://', ''))
    } catch (error) {
      return normalizedUrl
    }
  }

  try {
    return convertFileSrc(normalizedUrl)
  } catch (error) {
    return normalizedUrl
  }
}

export function VideoAttachment({ localPath, name }: VideoAttachmentProps) {
  const resolvedUrl = useMemo(() => resolveMediaUrl(localPath), [localPath])

  return (
    <div className="flex flex-col gap-1.5 max-w-md w-fit">
      <video src={resolvedUrl} controls className="rounded-2xl max-w-full max-h-96 bg-black" />
      {name && (
        <div className="text-xs text-muted-foreground opacity-80 mt-0.5 max-w-full truncate">
          {name}
        </div>
      )}
    </div>
  )
}

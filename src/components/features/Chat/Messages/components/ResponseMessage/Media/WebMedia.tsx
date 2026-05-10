import { useState, useEffect } from 'react'
import { previewService, PreviewData } from '@/lib/ui/services/preview'
import { logger } from '@/lib/core/utils/logger'
import { MediaItem } from '@/lib/core/messages/types'

interface WebMediaProps {
  item: MediaItem
}

// Helper function to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/v\/([\w-]{11})/,
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

// Helper function to check if URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null
}

export function WebMedia({ item }: WebMediaProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // For web type media, the URL is stored in metadata.sourceUrl
  const webUrl = (item.media.metadata?.sourceUrl as string) || item.media.localPath
  const isReference = item.media.metadata?.variant === 'reference'
  const isYouTube = isYouTubeUrl(webUrl)
  const youtubeVideoId = isYouTube ? getYouTubeVideoId(webUrl) : null

  // For YouTube videos, default to showing the video player
  const [showVideoPlayer, setShowVideoPlayer] = useState(isYouTube)

  // Reference 样式：小巧的引用链接，不需要加载预览
  if (isReference) {
    const hostname = (() => {
      try {
        return new URL(webUrl).hostname.replace('www.', '')
      } catch {
        return item.media.name
      }
    })()

    return (
      <a
        href={webUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded border border-border/50 hover:border-border transition-colors max-w-[200px]"
        title={item.media.name}
      >
        <span className="text-foreground/60">🔗</span>
        <span className="truncate text-foreground/80">{hostname}</span>
      </a>
    )
  }

  useEffect(() => {
    const loadPreview = async () => {
      // For YouTube URLs, create preview data immediately without fetching
      if (isYouTube && youtubeVideoId) {
        const youtubeThumbnail = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`
        setPreviewData({
          title: 'YouTube Video',
          description: 'Click to play video',
          image: { url: youtubeThumbnail, width: 1280, height: 720 },
          publisher: 'YouTube',
          url: webUrl,
        })
        setIsLoading(false)

        // Still try to fetch better metadata in the background
        try {
          const data = await previewService.fetchPreview(webUrl)
          if (data && data.title && data.title !== 'YouTube Video') {
            setPreviewData({
              ...data,
              image: data.image || { url: youtubeThumbnail, width: 1280, height: 720 },
              publisher: data.publisher || 'YouTube',
              url: data.url || webUrl,
            })
          }
        } catch (error) {
          logger.debug('Failed to enhance YouTube preview:', error)
        }
        return
      }

      // For non-YouTube URLs, fetch preview data normally
      try {
        const data = await previewService.fetchPreview(webUrl)
        setPreviewData(data)
      } catch (error) {
        logger.error('Failed to load web preview:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreview()
  }, [webUrl, isYouTube, youtubeVideoId])

  // YouTube 加载状态：显示播放器 placeholder
  if (isLoading && isYouTube) {
    return (
      <div className="max-w-md">
        <div className="relative w-full bg-gray-100 rounded-lg" style={{ paddingBottom: '56.25%' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-red-600 rounded-full animate-spin mx-auto" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-foreground/50">Loading YouTube video...</div>
      </div>
    )
  }

  // 普通 URL 加载状态
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg min-w-[140px] max-w-sm">
        <div className="text-lg flex-shrink-0">🌐</div>
        <div className="flex-1 text-xs text-foreground truncate">{webUrl}</div>
        <div className="w-3 h-3 border border-foreground/30 border-t-foreground rounded-full animate-spin flex-shrink-0" />
      </div>
    )
  }

  // 如果没有预览数据，显示简单的 URL 卡片
  if (!previewData) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer min-w-[140px] max-w-sm hover:bg-muted/50">
        <div className="text-lg flex-shrink-0">🌐</div>
        <div className="flex-1 text-xs text-foreground truncate">{webUrl}</div>
      </div>
    )
  }

  // YouTube 视频直接显示播放器（除非用户选择显示预览）
  if (isYouTube && youtubeVideoId && showVideoPlayer) {
    return (
      <div className="max-w-md">
        <div
          className="relative w-full"
          style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
        >
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg border-0"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0&modestbranding=1`}
            title={previewData?.title || 'YouTube video player'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="mt-2 text-xs text-foreground/50 flex items-center justify-between">
          <span>{previewData?.title || 'YouTube Video'}</span>
          <button
            onClick={() => setShowVideoPlayer(false)}
            className="text-foreground/70 hover:text-foreground"
          >
            Show Preview
          </button>
        </div>
      </div>
    )
  }

  // YouTube 预览卡片（作为 fallback，仅在用户明确选择时显示）
  if (isYouTube && youtubeVideoId && !showVideoPlayer) {
    const thumbnailUrl =
      previewData?.image?.url || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`
    const title = previewData?.title || 'YouTube Video'
    const description = previewData?.description || 'Click to play this YouTube video'
    const publisher = previewData?.publisher || 'YouTube'
    return (
      <div
        className="max-w-md border border-border rounded-lg overflow-hidden bg-background hover:bg-muted/20 cursor-pointer"
        onClick={() => setShowVideoPlayer(true)}
      >
        <div className="relative">
          {/* YouTube 缩略图 */}
          <div className="relative w-full h-48 bg-muted/50 flex items-center justify-center overflow-hidden">
            <>
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to standard quality thumbnail if maxres fails
                  if (e.currentTarget.src.includes('maxresdefault')) {
                    e.currentTarget.src = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
                  } else {
                    e.currentTarget.style.display = 'none'
                  }
                }}
              />
              {/* YouTube 播放按钮覆盖层 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          </div>

          {/* 内容信息 */}
          <div className="p-3">
            {/* 标题 */}
            <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">{title}</h3>

            {/* 描述 */}
            <p className="text-xs text-foreground/70 line-clamp-2 mb-2">{description}</p>

            {/* YouTube logo + 发布者 */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xs text-foreground/50 truncate">{publisher}</span>
              <span className="text-xs text-red-600 ml-auto">▶ Play Video</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 常规预览卡片：左图右文布局
  return (
    <div className="max-w-md border border-border rounded-lg overflow-hidden bg-background hover:bg-muted/20 cursor-pointer">
      <div className="flex items-center">
        {/* 左侧图片 */}
        <div className="flex-shrink-0 w-30 h-20 bg-muted/50 flex items-center justify-center overflow-hidden">
          {previewData?.image ? (
            <img
              src={previewData.image.url}
              alt={previewData.title || 'Preview'}
              className="w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="text-2xl">{isYouTube ? '🎥' : '🌐'}</div>
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 p-3 min-w-0">
          {/* 标题 */}
          {previewData?.title && (
            <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
              {previewData.title}
            </h3>
          )}

          {/* 描述 */}
          {previewData?.description && (
            <p className="text-xs text-foreground/70 line-clamp-2 mb-2">
              {previewData.description}
            </p>
          )}

          {/* 底部信息：logo + 发布者 */}
          <div className="flex items-center gap-2">
            {previewData?.logo && (
              <img
                src={previewData.logo.url}
                alt={previewData.publisher || 'Logo'}
                className="w-4 h-4 rounded flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <span className="text-xs text-foreground/50 truncate">
              {previewData?.publisher || new URL(webUrl).hostname}
            </span>
            {isYouTube && <span className="text-xs text-red-600 ml-auto">▶ YouTube</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

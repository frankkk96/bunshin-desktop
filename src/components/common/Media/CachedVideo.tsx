import React, { useMemo, useState, useEffect } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface CachedVideoProps {
  src: string
  className?: string
  style?: React.CSSProperties
  controls?: boolean
  muted?: boolean
  autoPlay?: boolean
  loop?: boolean
  playsInline?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  poster?: string
  onLoad?: () => void
  onError?: () => void
}

export function CachedVideo({
  src,
  className,
  style,
  controls = true,
  muted = true,
  autoPlay = false,
  loop = false,
  playsInline = true,
  preload = 'metadata',
  poster,
  onLoad,
  onError,
}: CachedVideoProps) {
  const [hasError, setHasError] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false)
  }, [src])

  const displayUrl = useMemo(() => {
    if (!src) return ''

    const trimmed = src.trim()
    if (!trimmed) return ''

    // Pass through if already a navigable URL
    if (/^(https?:|data:|asset:\/\/|tauri:\/\/)/i.test(trimmed)) {
      return trimmed
    }

    return convertFileSrc(trimmed)
  }, [src])

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  const handleLoadedData = () => {
    setHasError(false)
    onLoad?.()
  }

  if (!displayUrl || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className || ''}`}
        style={{ minHeight: 120, ...style }}
      >
        <span className="text-muted-foreground text-sm">
          {hasError ? 'Failed to load video' : 'No video'}
        </span>
      </div>
    )
  }

  return (
    <video
      src={displayUrl}
      className={className}
      style={style}
      controls={controls}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      playsInline={playsInline}
      preload={preload}
      poster={poster}
      onLoadedData={handleLoadedData}
      onError={handleError}
    />
  )
}

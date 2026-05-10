import React, { useMemo, useState, useEffect, useRef } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface CachedAudioProps {
  src: string
  className?: string
  style?: React.CSSProperties
  controls?: boolean
  muted?: boolean
  autoPlay?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  onLoad?: () => void
  onError?: () => void
}

export function CachedAudio({
  src,
  className,
  style,
  controls = true,
  muted = false,
  autoPlay = false,
  loop = false,
  preload = 'metadata',
  onLoad,
  onError,
}: CachedAudioProps) {
  const [hasError, setHasError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

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
        className={`flex items-center justify-center bg-muted rounded-md p-3 ${className || ''}`}
        style={style}
      >
        <span className="text-muted-foreground text-sm">
          {hasError ? 'Failed to load audio' : 'No audio'}
        </span>
      </div>
    )
  }

  return (
    <audio
      ref={audioRef}
      src={displayUrl}
      className={className}
      style={style}
      controls={controls}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      preload={preload}
      onLoadedData={handleLoadedData}
      onError={handleError}
    />
  )
}

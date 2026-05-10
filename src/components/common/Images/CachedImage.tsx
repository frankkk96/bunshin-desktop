import React, { useMemo, useState, useEffect } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'

interface CachedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  fallback?: React.ReactNode
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}

export function CachedImage({ src, alt, className, style, fallback, onLoad, onError }: CachedImageProps) {
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

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    onError?.(e)
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(false)
    onLoad?.(e)
  }

  if (!displayUrl) {
    return fallback || <div className={`bg-muted ${className || ''}`} style={style} />
  }

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}

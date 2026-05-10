import React, { useState, useEffect } from 'react'
import { mediaApi } from '@/lib/tauri/service/media'

interface UseImageProxyOptions {
  fallback?: string
  enabled?: boolean
}

/**
 * Hook to proxy image URLs through Tauri to avoid CORS issues
 * @param url - The image URL to proxy
 * @param options - Options for the proxy
 * @returns The proxied image data URL or fallback
 */
export function useImageProxy(url: string | undefined, options: UseImageProxyOptions = {}) {
  const { fallback = '', enabled = true } = options
  const [imageUrl, setImageUrl] = useState<string>(fallback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!url || !enabled) {
      setImageUrl(fallback)
      return
    }

    // If it's already a data URL or local file, use it directly
    if (url.startsWith('data:') || url.startsWith('file://')) {
      setImageUrl(url)
      return
    }

    let cancelled = false

    const fetchImage = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await mediaApi.proxyMedia(url)

        if (!cancelled) {
          setImageUrl(result.data || fallback)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to proxy image:', err)
          setError(err instanceof Error ? err : new Error(String(err)))
          setImageUrl(fallback)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchImage()

    return () => {
      cancelled = true
    }
  }, [url, fallback, enabled])

  return {
    imageUrl,
    loading,
    error,
  }
}

/**
 * Component wrapper for image proxy
 */
export function ProxiedImage({
  src,
  alt,
  className,
  style,
  fallback,
  onLoad,
  onError,
}: {
  src: string | undefined
  alt: string
  className?: string
  style?: React.CSSProperties
  fallback?: string
  onLoad?: () => void
  onError?: (error: Error) => void
}) {
  const { imageUrl, loading, error } = useImageProxy(src, { fallback })

  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  if (loading) {
    return (
      <div className={className} style={style}>
        <div className="animate-pulse bg-muted" />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={(e) => {
        if (onError) {
          onError(new Error('Failed to load image: ' + e.toString()))
        }
      }}
    />
  )
}

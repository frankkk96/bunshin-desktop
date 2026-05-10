import { useState, useCallback } from 'react'
import { Media, MediaType, mediaApi } from '@/lib/tauri/service/media'
import { handleFileError } from '@/lib/core/utils/error'

export interface MediaUploadState {
  // State
  selectedMedia: Media | null
  isUploading: boolean

  // Actions
  handleSelectImage: () => Promise<void>
  handleSelectVideo: () => Promise<void>
  handleSelectAudio: () => Promise<void>
  handleSelectPdf: () => Promise<void>
  removeMedia: () => void
  resetMedia: () => void
}

export function useMediaUpload(): MediaUploadState {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleMediaSelect = useCallback(async (mediaTypes: MediaType[] = ['image']) => {
    try {
      setIsUploading(true)

      const result = await mediaApi.selectMediaFromLibrary(mediaTypes)

      // User cancelled
      if (result.cancelled || !result.media) {
        setIsUploading(false)
        return
      }

      // Handle error
      if (result.error) {
        throw new Error(result.error)
      }

      setSelectedMedia(result.media)
    } catch (error) {
      handleFileError(error, {
        message: 'Failed to pick media, please try again',
      })
    } finally {
      setIsUploading(false)
    }
  }, [])

  const removeMedia = useCallback(() => {
    setSelectedMedia(null)
  }, [])

  const resetMedia = useCallback(() => {
    setSelectedMedia(null)
  }, [])

  const handleSelectImage = useCallback(async () => {
    await handleMediaSelect(['image'])
  }, [handleMediaSelect])

  const handleSelectVideo = useCallback(async () => {
    await handleMediaSelect(['video'])
  }, [handleMediaSelect])

  const handleSelectAudio = useCallback(async () => {
    await handleMediaSelect(['audio'])
  }, [handleMediaSelect])

  const handleSelectPdf = useCallback(async () => {
    await handleMediaSelect(['pdf'])
  }, [handleMediaSelect])

  return {
    // State
    selectedMedia,
    isUploading,

    handleSelectImage,
    handleSelectVideo,
    handleSelectAudio,
    handleSelectPdf,
    removeMedia,
    resetMedia,
  }
}

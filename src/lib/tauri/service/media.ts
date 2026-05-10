import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'

export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'web'

export interface Media {
  localPath: string // 本地路径，永远使用本地路径作为标识
  name: string
  type: MediaType
  mimeType: string
  metadata?: {
    sourceUrl?: string // 如果是从远端下载的，保存原始URL
    [key: string]: unknown
  }
}

export interface DataUrlResult {
  success: boolean
  dataUrl?: string // data URL 格式: data:{mimeType};base64,{data}
  error?: string
}

export interface MediaPickerResult {
  media: Media | null
  cancelled: boolean
  error?: string
}

export interface MediaData {
  url: string
  data?: string
}

export interface SaveMediaResult {
  localPath: string
  originalName: string
  mimeType: string
  size: number
}

/**
 * Media Manager - 媒体文件管理适配层
 *
 * 简单封装 Rust 后端的媒体处理功能
 */
export const mediaApi = {
  saveBase64: (base64Data: string, fileName: string): Promise<SaveMediaResult> => {
    return invoke<SaveMediaResult>('fs_save_base64_file', {
      base64Data,
      fileName,
      category: 'medias',
    })
  },

  getDataUrl: (media: Media): Promise<DataUrlResult> => {
    return invoke<DataUrlResult>('media_get_base64', { media })
  },

  selectMediaFromLibrary: (mediaTypes: MediaType[]): Promise<MediaPickerResult> => {
    return invoke<MediaPickerResult>('select_media_from_library', { mediaTypes })
  },

  proxyMedia: (url: string): Promise<MediaData> => {
    return invoke<MediaData>('proxy_media', { url })
  },

  openFile: async (filePath: string): Promise<void> => {
    const cleanPath = filePath.startsWith('file://') ? filePath.slice(7) : filePath
    await openPath(cleanPath)
  },
}

/**
 * PreviewService - URL 预览数据获取服务
 *
 * 职责：
 * 1. 通过 oEmbed 协议获取丰富的媒体预览数据
 * 2. 支持自动发现 oEmbed 端点
 * 3. 使用 Microlink API 作为 fallback
 * 4. 管理预览数据缓存
 */

import { logger } from '@/lib/core/utils/logger'
import { http } from '@/lib/tauri/system/http'

// ==================== 类型定义 ====================

export interface OEmbedResponse {
  version: string
  type: 'photo' | 'video' | 'rich' | 'link'
  width?: number
  height?: number
  title?: string
  description?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: number
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  url?: string
  html?: string
}

export interface PreviewData {
  title?: string
  description?: string
  image?: { url: string; width?: number; height?: number }
  logo?: { url: string }
  url: string
  publisher?: string
  author?: string
  date?: string
  video?: { url: string }
  audio?: { url: string }
  type?: 'photo' | 'video' | 'rich' | 'link'
  html?: string
}

interface CacheItem {
  data: PreviewData
  timestamp: number
}

interface OEmbedProvider {
  provider_name: string
  provider_url: string
  endpoints: Array<{
    schemes: string[]
    url: string
  }>
}

// ==================== 常量配置 ====================

const CACHE_TTL = 5 * 60 * 1000 // 5分钟
const REQUEST_TIMEOUT = 3000 // 3秒超时
const MICROLINK_DELAY = 500 // Microlink fallback 延迟

const OEMBED_PROVIDERS: OEmbedProvider[] = [
  {
    provider_name: 'YouTube',
    provider_url: 'https://www.youtube.com',
    endpoints: [
      {
        schemes: [
          'http://*.youtube.com/watch*',
          'http://*.youtube.com/v/*',
          'https://*.youtube.com/watch*',
          'https://*.youtube.com/v/*',
          'http://youtu.be/*',
          'https://youtu.be/*',
          'https://*.youtube.com/live/*',
          'https://*.youtube.com/shorts/*',
        ],
        url: 'https://www.youtube.com/oembed',
      },
    ],
  },
  {
    provider_name: 'Vimeo',
    provider_url: 'https://vimeo.com',
    endpoints: [
      {
        schemes: ['https://vimeo.com/*', 'https://vimeo.com/groups/*/videos/*'],
        url: 'https://vimeo.com/api/oembed.json',
      },
    ],
  },
  {
    provider_name: 'Twitter',
    provider_url: 'https://twitter.com',
    endpoints: [
      {
        schemes: [
          'https://twitter.com/*/status/*',
          'https://*.twitter.com/*/status/*',
          'https://x.com/*/status/*',
          'https://*.x.com/*/status/*',
        ],
        url: 'https://publish.twitter.com/oembed',
      },
    ],
  },
  {
    provider_name: 'Instagram',
    provider_url: 'https://instagram.com',
    endpoints: [
      {
        schemes: ['http://instagram.com/p/*', 'http://www.instagram.com/p/*'],
        url: 'https://graph.facebook.com/v16.0/instagram_oembed',
      },
    ],
  },
  {
    provider_name: 'TikTok',
    provider_url: 'https://www.tiktok.com',
    endpoints: [
      {
        schemes: ['https://www.tiktok.com/*/video/*', 'https://www.tiktok.com/@*'],
        url: 'https://www.tiktok.com/oembed',
      },
    ],
  },
  {
    provider_name: 'Spotify',
    provider_url: 'https://open.spotify.com',
    endpoints: [
      {
        schemes: ['https://open.spotify.com/*'],
        url: 'https://open.spotify.com/oembed',
      },
    ],
  },
  {
    provider_name: 'SoundCloud',
    provider_url: 'https://soundcloud.com',
    endpoints: [
      {
        schemes: ['https://soundcloud.com/*', 'https://soundcloud.app.goo.gl/*'],
        url: 'https://soundcloud.com/oembed',
      },
    ],
  },
]

// ==================== PreviewService 类 ====================

class PreviewService {
  private cache = new Map<string, CacheItem>()
  private pendingRequests = new Map<string, Promise<PreviewData | null>>()

  constructor() {
    // 定期清理过期缓存
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupCache(), 5 * 60 * 1000)
    }
  }

  // ==================== 公共接口 ====================

  /**
   * 获取 URL 的预览数据
   * 支持缓存和请求去重
   */
  async fetchPreview(url: string): Promise<PreviewData | null> {
    // 1. 检查缓存
    const cachedData = this.getCachedData(url)
    if (cachedData) {
      return cachedData
    }

    // 2. 检查是否有正在进行的请求
    const key = this.getCacheKey(url)
    const existingRequest = this.pendingRequests.get(key)
    if (existingRequest) {
      return existingRequest
    }

    // 3. 创建新的请求
    const requestPromise = this.fetchPreviewInternal(url)
    this.pendingRequests.set(key, requestPromise)

    try {
      const result = await requestPromise
      if (result) {
        this.setCachedData(url, result)
      }
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }

  // ==================== 私有方法 - 缓存管理 ====================

  private getCacheKey(url: string): string {
    return url.toLowerCase().trim()
  }

  private getCachedData(url: string): PreviewData | null {
    const key = this.getCacheKey(url)
    const item = this.cache.get(key)

    if (item && Date.now() - item.timestamp < CACHE_TTL) {
      return item.data
    }

    if (item) {
      this.cache.delete(key) // 清理过期缓存
    }

    return null
  }

  private setCachedData(url: string, data: PreviewData): void {
    const key = this.getCacheKey(url)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  // ==================== 私有方法 - 数据获取 ====================

  /**
   * 内部实际获取数据的函数，支持多策略并行
   */
  private async fetchPreviewInternal(url: string): Promise<PreviewData | null> {
    try {
      // 并行执行多个策略，谁先成功就用谁的结果
      const strategies = [
        // Strategy 1: 已知 oEmbed 提供商
        this.fetchFromKnownProvider(url),

        // Strategy 2: oEmbed 自动发现
        this.fetchFromDiscoveredEndpoint(url),

        // Strategy 3: Microlink 作为 fallback (延迟启动)
        this.fetchFromMicrolink(url),
      ]

      // 等待第一个成功的结果
      const results = await Promise.allSettled(strategies)

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value
        }
      }

      return null
    } catch (error) {
      logger.error('[PreviewService] Failed to fetch preview:', error)
      return null
    }
  }

  /**
   * 从已知的 oEmbed 提供商获取数据
   */
  private async fetchFromKnownProvider(url: string): Promise<PreviewData | null> {
    const endpoint = this.findOEmbedEndpoint(url)
    if (!endpoint) {
      return null
    }

    try {
      const oembedUrl = `${endpoint}?url=${encodeURIComponent(
        url,
      )}&format=json&maxwidth=480&maxheight=300`
      const response = await this.fetchWithTimeout(oembedUrl)

      if (!response.ok) {
        return null
      }

      const data: OEmbedResponse = await response.json()
      return this.convertOEmbedToPreview(data, url)
    } catch (error) {
      logger.debug('[PreviewService] Known provider fetch failed:', error)
      return null
    }
  }

  /**
   * 通过自动发现获取 oEmbed 数据
   */
  private async fetchFromDiscoveredEndpoint(url: string): Promise<PreviewData | null> {
    const endpoint = await this.discoverOEmbedEndpoint(url)
    if (!endpoint) {
      return null
    }

    try {
      const oembedUrl = endpoint.includes('?')
        ? `${endpoint}&url=${encodeURIComponent(url)}&maxwidth=480&maxheight=300`
        : `${endpoint}?url=${encodeURIComponent(url)}&format=json&maxwidth=480&maxheight=300`

      const response = await this.fetchWithTimeout(oembedUrl)

      if (!response.ok) {
        return null
      }

      const data: OEmbedResponse = await response.json()
      return this.convertOEmbedToPreview(data, url)
    } catch (error) {
      logger.debug('[PreviewService] Discovery fetch failed:', error)
      return null
    }
  }

  /**
   * 使用 Microlink API 作为 fallback
   */
  private async fetchFromMicrolink(url: string): Promise<PreviewData | null> {
    // 延迟启动，给 oEmbed 优先机会
    await new Promise((resolve) => setTimeout(resolve, MICROLINK_DELAY))

    try {
      const response = await this.fetchWithTimeout(
        `https://api.microlink.io?url=${encodeURIComponent(
          url,
        )}&screenshot=false&video=false&audio=false`,
      )

      if (!response.ok) {
        return null
      }

      const fetchData = await response.json()
      if (fetchData.status === 'success' && fetchData.data) {
        return {
          title: fetchData.data.title,
          description: fetchData.data.description,
          image: fetchData.data.image ? { url: fetchData.data.image.url } : undefined,
          logo: fetchData.data.logo ? { url: fetchData.data.logo.url } : undefined,
          url: fetchData.data.url || url,
          publisher: fetchData.data.publisher,
          author: fetchData.data.author,
          date: fetchData.data.date,
          video: fetchData.data.video ? { url: fetchData.data.video.url } : undefined,
          audio: fetchData.data.audio ? { url: fetchData.data.audio.url } : undefined,
        }
      }

      return null
    } catch (error) {
      logger.debug('[PreviewService] Microlink fetch failed:', error)
      return null
    }
  }

  // ==================== 私有方法 - 工具函数 ====================

  /**
   * 查找已知的 oEmbed 端点
   */
  private findOEmbedEndpoint(url: string): string | null {
    for (const provider of OEMBED_PROVIDERS) {
      for (const endpoint of provider.endpoints) {
        for (const scheme of endpoint.schemes) {
          if (this.matchesScheme(url, scheme)) {
            return endpoint.url
          }
        }
      }
    }
    return null
  }

  /**
   * 检查 URL 是否匹配 scheme 模式
   */
  private matchesScheme(url: string, scheme: string): boolean {
    const regexPattern = scheme
      .replace(/\*/g, '.*')
      .replace(/\./g, '\\.')
      .replace(/\?/g, '\\?')
      .replace(/\+/g, '\\+')

    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(url)
  }

  /**
   * 自动发现页面中的 oEmbed 端点
   */
  private async discoverOEmbedEndpoint(url: string): Promise<string | null> {
    try {
      const response = await this.fetchWithTimeout(url, { mode: 'cors' })
      if (!response.ok) {
        return null
      }

      const html = await response.text()
      const oembedMatch =
        html.match(
          /<link[^>]*rel="alternate"[^>]*type="application\/json\+oembed"[^>]*href="([^"]+)"/i,
        ) ||
        html.match(
          /<link[^>]*type="application\/json\+oembed"[^>]*rel="alternate"[^>]*href="([^"]+)"/i,
        )

      return oembedMatch ? oembedMatch[1] : null
    } catch (error) {
      logger.debug('[PreviewService] oEmbed discovery failed:', error)
      return null
    }
  }

  /**
   * 将 oEmbed 数据转换为统一的预览数据格式
   */
  private convertOEmbedToPreview(oembedData: OEmbedResponse, originalUrl: string): PreviewData {
    const baseData: PreviewData = {
      title: oembedData.title,
      description: oembedData.description,
      url: originalUrl,
      publisher: oembedData.provider_name,
      author: oembedData.author_name,
      type: oembedData.type,
      html: oembedData.html,
    }

    // Set image from thumbnail
    if (oembedData.thumbnail_url) {
      baseData.image = {
        url: oembedData.thumbnail_url,
        width: oembedData.thumbnail_width,
        height: oembedData.thumbnail_height,
      }
    }

    // For photo type, use the main URL as image
    if (oembedData.type === 'photo' && oembedData.url) {
      baseData.image = {
        url: oembedData.url,
        width: oembedData.width,
        height: oembedData.height,
      }
    }

    // Set provider logo if available
    if (oembedData.provider_url) {
      try {
        const domain = new URL(oembedData.provider_url).hostname
        baseData.logo = { url: `https://${domain}/favicon.ico` }
      } catch {
        // Ignore favicon construction errors
      }
    }

    return baseData
  }

  /**
   * 带超时的 fetch 包装器
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await http.fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

// 导出单例
export const previewService = new PreviewService()

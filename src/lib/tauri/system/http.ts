import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { settings } from '@/lib/tauri/system/settings'

/**
 * HTTP Client - HTTP 请求适配层
 *
 * 封装 tauri-plugin-http，自动注入代理配置
 */

type RequestInitWithProxy = RequestInit & {
  proxy?: { all: string }
}

export const http = {
  /**
   * 带代理支持的 fetch
   */
  fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const appSettings = await settings.get()
    const proxyUrl = appSettings.proxy?.enabled ? appSettings.proxy.url : null

    const requestInit: RequestInitWithProxy = { ...init }
    if (proxyUrl?.trim()) {
      requestInit.proxy = { all: proxyUrl.trim() }
    }

    return tauriFetch(input, requestInit)
  },

  /**
   * 直接 fetch（不使用代理）
   */
  directFetch: tauriFetch,

  /**
   * 测试代理连接
   */
  testProxy: async (proxyUrl: string): Promise<boolean> => {
    try {
      const response = await tauriFetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        proxy: { all: proxyUrl.trim() },
      } as RequestInitWithProxy)
      return response.ok
    } catch {
      return false
    }
  },
}

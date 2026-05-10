/**
 * Status Store
 *
 * 集中管理 Extension 的状态
 * 订阅底层 Service 的变化，自动同步状态到 Zustand
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { extensionService } from '@/lib/core/extensions/extension-service'
import type { ExtensionStatus } from '@/lib/core/extensions/types'

export interface StatusStore {
  extensions: Map<string, ExtensionStatus>
}

// 创建 Store
export const useStatusStore = create<StatusStore>()(
  subscribeWithSelector(() => ({
    extensions: new Map(),
  })),
)

// ==================== Simple Selectors ====================

/**
 * 选择单个 Extension 的状态
 */
export const selectExtensionStatus = (id: string) => (state: StatusStore) =>
  state.extensions.get(id) ?? null

// ==================== 订阅 Services ====================
// 模块加载时立即执行，确保在 Service 初始化前就设置好订阅

// 订阅 ExtensionService
extensionService.subscribe((extensionId) => {
  const status = extensionService.getExtensionStatus(extensionId)

  useStatusStore.setState((state) => {
    const extensions = new Map(state.extensions)

    if (status) {
      extensions.set(extensionId, status)
    } else {
      extensions.delete(extensionId)
    }

    return { extensions }
  })
})

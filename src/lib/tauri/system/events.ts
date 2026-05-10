import { emit as tauriEmit, listen as tauriListen, UnlistenFn } from '@tauri-apps/api/event'

/**
 * Tauri Event Bus - 跨进程事件通信
 *
 * 仅用于真正需要跨进程通信的场景（如 Rust 后端发送事件到前端）
 * 前端内部通信请使用 @/lib/core/events/event-bus 中的 eventBus
 */
export const tauriEventBus = {
  /**
   * 发送跨窗口事件
   */
  emit: <T>(event: string, payload: T): Promise<void> => {
    return tauriEmit(event, payload)
  },

  /**
   * 监听跨窗口事件
   */
  listen: <T>(
    event: string,
    handler: (event: { payload: T }) => void,
  ): Promise<UnlistenFn> => {
    return tauriListen<T>(event, handler)
  },

  /**
   * 创建一个事件作用域，方便管理多个 listener 的生命周期
   */
  createScope: (): TauriEventScope => new TauriEventScope(),
}

/**
 * TauriEventScope - 管理一组 Tauri 事件监听器的生命周期
 *
 * 用法:
 * ```ts
 * const scope = tauriEventBus.createScope()
 * scope.listen<MyEvent>('my-event', handler)
 * scope.listen<OtherEvent>('other-event', handler2)
 * // 一次性清理所有 listener
 * scope.destroy()
 * ```
 */
export class TauriEventScope {
  private unlistenFns: (UnlistenFn | Promise<UnlistenFn>)[] = []

  listen<T>(event: string, handler: (event: { payload: T }) => void): void {
    const unlistenPromise = tauriListen<T>(event, handler)
    this.unlistenFns.push(unlistenPromise)
  }

  destroy(): void {
    this.unlistenFns.forEach((fn) => {
      if (fn instanceof Promise) {
        fn.then((unlisten) => unlisten())
      } else {
        fn()
      }
    })
    this.unlistenFns = []
  }
}

// 导出类型供外部使用
export type { UnlistenFn }

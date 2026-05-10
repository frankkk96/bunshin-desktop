import { MessageEventType, StreamEvent, EditMessageEvent, RestoredMessageEvent } from './message'
import {
  WorkflowEventType,
  TaskPendingEvent,
  TaskDoneEvent,
  EnqueueQueriesEvent,
  CancelWorkflowEvent,
  RetryTaskEvent,
  RetryQueryEvent,
} from './workflow'
import {
  ToolCallEventType,
  ToolCallPendingEvent,
  ToolCallRunEvent,
  ToolCallDoneEvent,
  ToolCallUpdateEvent,
} from './tool-call'
import { ErrorEventType, TaskErrorEvent } from './error'

/**
 * 事件类型映射 - 用于类型推断
 */
export interface EventMap {
  // Message events
  [MessageEventType.StreamEvent]: StreamEvent
  [MessageEventType.EditMessage]: EditMessageEvent
  [MessageEventType.RestoredMessage]: RestoredMessageEvent
  // Workflow events
  [WorkflowEventType.TaskPending]: TaskPendingEvent
  [WorkflowEventType.TaskDone]: TaskDoneEvent
  [WorkflowEventType.EnqueueQueries]: EnqueueQueriesEvent
  [WorkflowEventType.CancelWorkflow]: CancelWorkflowEvent
  [WorkflowEventType.RetryTask]: RetryTaskEvent
  [WorkflowEventType.RetryQuery]: RetryQueryEvent
  // ToolCall events
  [ToolCallEventType.ToolCallPending]: ToolCallPendingEvent
  [ToolCallEventType.ToolCallRun]: ToolCallRunEvent
  [ToolCallEventType.ToolCallDone]: ToolCallDoneEvent
  [ToolCallEventType.ToolCallUpdate]: ToolCallUpdateEvent
  // Error events
  [ErrorEventType.TaskError]: TaskErrorEvent
}

type EventHandler<T> = (event: T) => void

/**
 * 应用内部同步事件总线
 *
 * 优势（相比 Tauri eventBus）：
 * 1. 同步执行，保证事件处理顺序
 * 2. 不经过 IPC，性能更好
 * 3. 适合同一窗口内的事件通信
 *
 * 仅用于前端内部通信，跨进程通信（如 OAuth 回调）请使用 tauriEventBus
 */
class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>()

  /**
   * 发送事件，同步调用所有 handler
   */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(payload)
      } catch (error) {
        console.error('EventBus handler error:', error)
      }
    })
  }

  /**
   * 订阅事件（类型安全）
   * @returns 取消订阅的函数
   */
  subscribe<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
    }
  }

  /**
   * 创建事件作用域，方便管理多个订阅的生命周期
   */
  createScope(): EventScope {
    return new EventScope(this)
  }
}

/**
 * EventScope - 管理一组事件订阅的生命周期
 */
class EventScope {
  private unsubscribeFns: (() => void)[] = []

  constructor(private bus: EventBus) {}

  subscribe<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const unsubscribe = this.bus.subscribe(event, handler)
    this.unsubscribeFns.push(unsubscribe)
  }

  destroy(): void {
    this.unsubscribeFns.forEach((fn) => fn())
    this.unsubscribeFns = []
  }
}

export const eventBus = new EventBus()

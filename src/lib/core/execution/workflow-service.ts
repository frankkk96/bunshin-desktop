import { eventBus } from '../events/event-bus'
import { Message } from '../messages/types'
import { Workflow } from './workflow'
import { WorkflowSnapshot } from './types'
import { WorkflowEventType } from '../events/workflow'
import { MessageEventType } from '../events/message'
import { ToolCallEventType } from '../events/tool-call'
import { ErrorEventType } from '../events/error'
import { debounceByKey } from '../utils/debounce'

export type WorkflowListener = (sessionId: string) => void

// 去抖间隔（毫秒）- 平衡流畅度和性能
const NOTIFY_DEBOUNCE_MS = 50

export class WorkflowService {
  private workflows = new Map<string, Workflow>()
  private listeners = new Set<(sessionId: string) => void>()
  private eventScope = eventBus.createScope()

  // 按 sessionId 去抖的通知函数
  private debouncedNotify = debounceByKey(
    (sessionId: string) => {
      const workflow = this.workflows.get(sessionId)
      if (workflow) {
        workflow.updateSnapshot()
        this.listeners.forEach((listener) => listener(sessionId))
      }
    },
    NOTIFY_DEBOUNCE_MS,
    (sessionId) => sessionId,
  )

  constructor() {
    this.subscribeMessageEvents()
    this.subscribeWorkflowEvents()
    this.subscribeToolCallEvents()
    this.subscribeErrorEvents()
  }

  private subscribeMessageEvents(): void {
    const s = this.eventScope
    s.subscribe(MessageEventType.StreamEvent, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleStreamEvent(e)),
    )
    s.subscribe(MessageEventType.EditMessage, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleEditMessage(e.messageId, e.content)),
    )
    s.subscribe(MessageEventType.RestoredMessage, (e) => this.notify(e.sessionId))
  }

  private subscribeWorkflowEvents(): void {
    const s = this.eventScope
    s.subscribe(WorkflowEventType.TaskPending, (e) =>
      this.withWorkflow(e.sessionId, (w) =>
        w.handleTaskPending(e.agentId, e.round, e.queryId, e.taskId),
      ),
    )
    s.subscribe(WorkflowEventType.TaskDone, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleTaskDone(e.taskId, e.status)),
    )
    s.subscribe(WorkflowEventType.EnqueueQueries, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleEnqueueQueries(e.queryParams)),
    )
    s.subscribe(WorkflowEventType.CancelWorkflow, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleCancel()),
    )
    s.subscribe(WorkflowEventType.RetryTask, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleRetryTask(e.queryId, e.taskId)),
    )
    s.subscribe(WorkflowEventType.RetryQuery, (e) =>
      this.withWorkflow(e.sessionId, (w) => w.handleRetryQuery(e.queryId)),
    )
  }

  private subscribeToolCallEvents(): void {
    const s = this.eventScope
    s.subscribe(ToolCallEventType.ToolCallPending, (e) =>
      this.withWorkflow(e.metadata.sessionId, (w) => w.handleToolCallPending(e)),
    )
    s.subscribe(ToolCallEventType.ToolCallRun, (e) =>
      this.withWorkflow(e.metadata.sessionId, (w) => w.handleToolCallRun(e)),
    )
    s.subscribe(ToolCallEventType.ToolCallUpdate, (e) =>
      this.withWorkflow(e.metadata.sessionId, (w) => w.handleToolCallUpdate(e)),
    )
    s.subscribe(ToolCallEventType.ToolCallDone, (e) =>
      this.withWorkflow(e.metadata.sessionId, (w) => w.handleToolCallDone(e)),
    )
  }

  private subscribeErrorEvents(): void {
    const s = this.eventScope
    s.subscribe(ErrorEventType.TaskError, (e) =>
      this.withWorkflow(e.context.sessionId, (w) => w.handleTaskError(e)),
    )
  }

  private withWorkflow(sessionId: string, action: (workflow: Workflow) => void): void {
    const workflow = this.ensureWorkflow(sessionId)
    action(workflow)
    this.notify(sessionId)
  }

  public destroy(): void {
    this.eventScope.destroy()
    this.listeners.clear()
    this.workflows.clear()
    this.debouncedNotify.cancel()
  }

  public subscribe(listener: WorkflowListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public getMessages(sessionId: string): Message[] {
    const workflow = this.ensureWorkflow(sessionId)
    return workflow.messages
  }

  public getSnapshot(sessionId: string): WorkflowSnapshot {
    const workflow = this.ensureWorkflow(sessionId)
    return workflow.snapshot
  }

  private ensureWorkflow(sessionId: string): Workflow {
    let workflow = this.workflows.get(sessionId)
    if (!workflow) {
      workflow = new Workflow(sessionId)
      this.workflows.set(sessionId, workflow)
    }
    return workflow
  }

  private notify(sessionId: string): void {
    this.debouncedNotify(sessionId)
  }
}

export const workflowService = new WorkflowService()

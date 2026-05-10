import {
  ToolCallParams,
  ToolCallMetadata,
  ToolCallResult,
  ToolCallStatus,
} from '../extensions/types'
import { extensionService } from '../extensions/extension-service'
import { agentsApi } from '@/lib/tauri/repo/agents'
import { eventBus } from '../events/event-bus'
import { ToolCallEventType } from '../events/tool-call'

export class ToolCall {
  private _metadata: ToolCallMetadata
  private _params: ToolCallParams
  private _status: ToolCallStatus

  constructor(metadata: ToolCallMetadata, params: ToolCallParams) {
    this._metadata = metadata
    this._params = params
    this._status = 'executing'
  }

  public get metadata(): ToolCallMetadata {
    return this._metadata
  }

  public get params(): ToolCallParams {
    return this._params
  }

  public get status(): ToolCallStatus {
    return this._status
  }

  public async run(): Promise<void> {
    try {
      await this.execute()
    } catch (error) {
      this.updateStatus('failed', {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      eventBus.emit(ToolCallEventType.ToolCallDone, {
        metadata: this._metadata,
      })
    }
  }

  private async execute(): Promise<void> {
    this.updateStatus('executing')

    if (!this.isValid()) {
      this.updateStatus('failed', { success: false, error: 'Invalid tool call' })
      return
    }

    const agent = await agentsApi.getById(this._metadata.agentId)
    if (!agent) {
      this.updateStatus('failed', { success: false, error: 'Agent not found' })
      return
    }

    let result: ToolCallResult | undefined
    let handled = false

    for (const extension of agent.extension.mcpServers) {
      const serverRuntime = await extensionService.getMCPServer(extension.id)
      if (!serverRuntime) {
        this.updateStatus('failed', {
          success: false,
          error: `Extension ${extension.name} not found`,
        })
        return
      }

      if (serverRuntime.canHandleToolCall(this._params)) {
        result = await serverRuntime.executeTool(this._params)
        handled = true
        break
      }
    }

    if (!handled) {
      this.updateStatus('failed', {
        success: false,
        error: `Tool '${this._params.function.name}' not found`,
      })
      return
    }

    if (!result) {
      this.updateStatus('failed', {
        success: false,
        error: 'Tool call result not found',
      })
      return
    }

    if (!result.success) {
      this.updateStatus('failed', result)
      return
    }

    this.updateStatus('completed', result)
  }

  private isValid(): boolean {
    const hasId = Boolean(this._params.id && this._params.id.trim() !== '')
    const hasName = Boolean(this._params.function.name && this._params.function.name.trim() !== '')
    const hasArguments = this._params.function.arguments !== undefined
    return hasId && hasName && hasArguments
  }

  private updateStatus(status: ToolCallStatus, result?: ToolCallResult): void {
    this._status = status

    let text = ''
    switch (status) {
      case 'pending_approval':
      case 'executing':
        text = `Calling ${this._params.function.name}: ${this._params.function.arguments}`
        break
      case 'completed':
        text = result?.data || ''
        break
      case 'failed':
        text = result?.error ? 'Tool call failed: ' + result.error : 'Tool call failed'
        break
      case 'rejected':
        text = 'Tool call rejected'
        break
      default:
        text = `Tool calls: ${status}`
    }

    eventBus.emit(ToolCallEventType.ToolCallUpdate, {
      metadata: this._metadata,
      status: this._status,
      text: text,
    })
  }
}

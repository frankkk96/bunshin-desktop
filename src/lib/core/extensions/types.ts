import { ConnectionStatus } from '@/hooks/status/types'

export type ExtensionType = 'mcp'

export interface ExtensionTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
  extensionId: string
  extensionName: string
}

export interface ExtensionStatus {
  id: string
  name: string
  type: ExtensionType
  extensionTools: ExtensionTool[]
  connectionStatus: ConnectionStatus
  isReady: boolean
  issues: string[]
  lastUpdated: number
}

export interface ExtensionMetadata {
  id: string
  name: string
  description: string
  type: ExtensionType
}

export interface ExtensionStartResult {
  success: boolean
  tools?: ExtensionTool[]
  error?: string
  reason?: string
}

export interface Extension {
  // ==================== Metadata ====================
  readonly id: string
  readonly name: string
  readonly type: ExtensionType
  readonly metadata: ExtensionMetadata

  // ==================== 生命周期 ====================
  /**
   * 启动 Extension（返回结果，不直接更新状态）
   */
  start(): Promise<ExtensionStartResult>

  /**
   * 停止 Extension（可选）
   */
  stop?(): Promise<void>

  // ==================== 工具相关 ====================
  /**
   * 获取工具列表
   */
  readonly tools: ExtensionTool[]

  /**
   * 检查是否可以处理指定的工具调用
   */
  canHandleToolCall(toolCall: ToolCallParams): boolean

  /**
   * 执行工具调用
   */
  executeTool(toolCall: ToolCallParams): Promise<ToolCallResult>
}

export interface ToolCallParams {
  id: string
  function: {
    name: string
    arguments: string
  }
}

export interface ToolCallMetadata {
  taskId: string
  sessionId: string
  queryId: number
  agentId: string
  round: number
}

// Tool call user actions
export type ToolCallAction = 'reject' | 'allow' | 'allow_always'

// 简化的 ToolCall 状态
export type ToolCallStatus = 'executing' | 'pending_approval' | 'rejected' | 'completed' | 'failed'

// 统一的 ToolCall 对象
export interface ToolCallRuntime {
  // 基本信息
  tc: ToolCallParams

  // 状态和时间
  status: ToolCallStatus

  // 执行结果
  result?: {
    success: boolean
    data?: unknown
    error?: string
  }

  // 元数据
  metadata: ToolCallMetadata
  createdAt: number
  completedAt?: number
}

export interface ToolCallResult {
  success: boolean
  data?: string
  error?: string
  metadata?: Record<string, any>
}

import {
  ToolCallParams,
  ExtensionStartResult,
  ToolCallResult,
  ExtensionTool,
  ExtensionMetadata,
  Extension,
} from '@/lib/core/extensions/types'
import { logger } from '@/lib/core/utils/logger'
import { mcpApi } from '@/lib/tauri/service/mcp'
import { MCPServerConfig, MCPToolResult } from './types'

export class MCPServer implements Extension {
  // TODO: 要支持关闭部分tool
  private _metadata: ExtensionMetadata
  private _config: MCPServerConfig
  private _tools: ExtensionTool[] = []

  constructor(config: MCPServerConfig) {
    this._metadata = {
      id: config.id,
      name: config.name,
      type: 'mcp',
      description: 'mcp server',
    }
    this._config = config
  }

  public get id(): string {
    return this._metadata.id
  }

  public get name(): string {
    return this._metadata.name
  }

  public get type(): 'mcp' {
    return this._metadata.type as 'mcp'
  }

  public get metadata(): ExtensionMetadata {
    return { ...this._metadata }
  }

  public get config(): MCPServerConfig {
    return this._config
  }

  public get tools(): ExtensionTool[] {
    if (!this._config.enabled) {
      return []
    }
    return this._tools
  }

  public async start(): Promise<ExtensionStartResult> {
    // 检查配置是否启用
    if (!this._config.enabled) {
      logger.info(`MCP server ${this.name} is disabled`)
      return { success: false, reason: 'Server is disabled' }
    }

    // 检查配置是否存在
    if (!this._config) {
      return { success: false, error: 'Server configuration not loaded' }
    }

    try {
      // 转换数据库配置为 Tauri 配置格式
      const tauriConfig = {
        id: this._config.id,
        name: this._config.name,
        server_type: this._config.serverType,
        command: this._config.command,
        args: this._config.args,
        env: this._config.env,
        url: this._config.url,
        enabled: true,
      }

      // 通过 Tauri 后端启动 MCP 服务器（同步等待完成，包括 OAuth）
      // 后端返回完整的 ExtensionTool（含 extensionId 和 extensionName）
      const result = await mcpApi.startServer(tauriConfig)
      const tools = result.tools ?? []

      // 更新内部工具列表
      this._tools = tools

      return { success: true, tools }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  public canHandleToolCall(toolCall: ToolCallParams): boolean {
    const toolName = toolCall.function.name.trim()
    return toolName.startsWith(`mcp_${this.id}_`)
  }

  public async executeTool(toolCall: ToolCallParams): Promise<ToolCallResult> {
    const toolName = toolCall.function.name.trim()
    const mcpToolParts = toolName.split('_')

    if (mcpToolParts.length < 3) {
      return { success: false, error: `Invalid MCP tool name: ${toolName}` }
    }

    const mcpToolName = mcpToolParts.slice(2).join('_')

    logger.info(`Executing MCP tool: ${mcpToolName} on server ${this.id}`)

    try {
      // 解析工具参数
      let toolArgs = null
      try {
        const trimmed = toolCall.function.arguments.trim()
        if (!trimmed) {
          toolArgs = {}
        }
        toolArgs = JSON.parse(trimmed)
      } catch (error) {
        toolArgs = null
      }

      if (toolArgs === null) {
        return {
          success: false,
          error: 'Tool arguments are invalid or incomplete',
        }
      }

      // const toolResult = await this.executeToolInternal(mcpToolName, toolArgs)
      const toolResult: MCPToolResult = await mcpApi.callTool(this.id, mcpToolName, toolArgs)

      // 处理MCP工具结果内容
      let resultContent = ''
      if (toolResult.content && Array.isArray(toolResult.content)) {
        resultContent = toolResult.content
          .map((item: any) => {
            if (item.type === 'text') {
              return item.text || ''
            } else if (item.type === 'image') {
              return `[Image: ${item.data || item.url || 'image'}]`
            } else if (item.type === 'resource') {
              return `[Resource: ${item.url || 'resource'}]`
            }
            return ''
          })
          .filter(Boolean)
          .join('\n')
      }

      const result: ToolCallResult = {
        success: !toolResult.isError,
        data: resultContent || JSON.stringify(toolResult),
      }

      logger.info(`MCP tool ${mcpToolName} executed`, {
        success: result.success,
        serverId: this.id,
      })

      return result
    } catch (error) {
      logger.error(`MCP tool ${mcpToolName} execution failed:`, error)
      return {
        success: false,
        error: JSON.stringify(error),
      }
    }
  }

  /**
   * 停止 MCP 服务器（实现 ExtensionRuntime.stop）
   */
  public async stop(): Promise<void> {
    try {
      await mcpApi.stopServer(this.id)
      logger.info(`MCP server ${this.name} stopped`)
    } catch (error) {
      logger.error(`Failed to stop MCP server ${this.name}:`, error)
      throw error
    }

    // 清空工具列表
    this._tools = []
  }
}

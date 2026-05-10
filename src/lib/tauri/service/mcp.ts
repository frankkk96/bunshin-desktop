import { invoke } from '@tauri-apps/api/core'
import { MCPToolResult } from '../../core/extensions/mcp-servers/types'
import { ExtensionTool } from '../../core/extensions/types'

/**
 * MCP Server Manager - MCP 服务器管理适配层
 *
 * 封装 MCP 服务器的启动、停止、工具管理等核心业务功能
 */

export interface MCPServerConfig {
  id: string
  name: string
  server_type: 'stdio' | 'http'
  command?: string
  args?: string[]
  env?: { key: string; value: string }[]
  url?: string
  enabled: boolean
}

interface MCPStartServerResult {
  tools: ExtensionTool[]
}

export const mcpApi = {
  /**
   * 启动 MCP 服务器
   * 返回工具列表 (OAuth 在后端自动处理)
   */
  startServer: (config: MCPServerConfig): Promise<MCPStartServerResult> => {
    return invoke('mcp_start_server', { config })
  },

  /**
   * 停止 MCP 服务器
   */
  stopServer: (serverId: string): Promise<void> => {
    return invoke('mcp_stop_server', { serverId })
  },

  /**
   * 取消正在进行的 MCP 服务器连接
   */
  cancelConnection: (serverId: string): Promise<void> => {
    return invoke('mcp_cancel_connection', { serverId })
  },

  /**
   * 获取 MCP 服务器的工具列表
   */
  listTools: (serverId: string): Promise<ExtensionTool[]> => {
    return invoke('mcp_list_tools', { serverId })
  },

  /**
   * 调用 MCP 工具
   */
  callTool: (serverId: string, toolName: string, args: any): Promise<MCPToolResult> => {
    return invoke('mcp_call_tool', {
      serverId,
      toolName,
      arguments: args,
    })
  },
}

import { ConfigSchema } from '@/lib/core/config/types'
import { MCPServer } from '../mcp-server'
import { MCPServerBuilderConfig } from '../types'

export abstract class MCPServerBuilder {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly avatar?: string

  constructor(config: { id: string; name: string; description?: string; avatar?: string }) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.avatar = config.avatar
  }

  /**
   * 获取配置 Schema
   */
  abstract get configSchema(): ConfigSchema

  /**
   * 获取初始配置
   */
  abstract get initialConfig(): MCPServerBuilderConfig

  /**
   * 执行工具调用
   */
  abstract buildMCPServer(config: MCPServerBuilderConfig): MCPServer
}

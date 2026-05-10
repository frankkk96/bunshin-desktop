import { logger } from '@/lib/core/utils/logger'
import { agentsApi } from '@/lib/tauri/repo/agents'
import { Extension, ExtensionStatus } from '@/lib/core/extensions/types'
import { ConnectionStatus } from '@/hooks/status/types'
import { handleInitializationError } from '@/lib/core/utils/error'
import { MCPServerBuilderConfig } from '@/lib/core/extensions/mcp-servers/types'
import { getBuilderByType } from './mcp-servers/builder'
import { mcpServerId } from '../utils/random'

type ExtensionStatusListener = (extensionId: string) => void

class ExtensionService {
  // 状态存储 - 唯一事实源
  private statuses = new Map<string, ExtensionStatus>()

  // Extension 实例管理
  private extensions = new Map<string, Extension>()

  // 订阅机制
  private listeners = new Set<ExtensionStatusListener>()

  // 初始化 Promise
  public readonly ready: Promise<void>

  constructor() {
    this.ready = this.initialize().catch((error) => {
      logger.error('Failed to initialize ExtensionService', error)
      throw error
    })
  }

  /**
   * 初始化服务 - 加载所有 extensions
   */
  private async initialize(): Promise<void> {
    try {
      // 从数据库加载所有 agents 的 extension 配置
      const agents = await agentsApi.getAll()
      for (const agent of agents) {
        // 加载 MCP servers
        const mcpServers = agent.extension.mcpServers || []
        for (const serverConfig of mcpServers) {
          try {
            const builder = getBuilderByType(
              mcpServerId(agent.id, serverConfig.type),
              serverConfig.type,
            )
            const extension = builder.buildMCPServer(serverConfig)
            await this.registerAndStartExtension(extension, serverConfig.enabled)
          } catch (error) {
            logger.error(`Failed to initialize extension ${serverConfig.id}:`, error)
          }
        }

        // 未来可以在这里加载其他类型的 extensions
        // const chromeExtensions = agent.extension.chromeExtensions || []
        // ...
      }
      logger.debug('ExtensionService initialized')
    } catch (error) {
      handleInitializationError(error, { message: 'Failed to initialize ExtensionService' })
      throw error
    }
  }

  /**
   * 注册并启动 extension
   */
  private async registerAndStartExtension(extension: Extension, enabled: boolean): Promise<void> {
    // 注册到 service
    this.extensions.set(extension.id, extension)

    // 设置初始状态
    this.setExtensionIdle(extension, 'Extension registered but not started')

    // 如果配置为启用，则启动
    if (enabled) {
      await this.startExtensionInstance(extension)
    } else {
      this.setExtensionDisabled(extension)
    }

    logger.debug(`Initialized extension: ${extension.id}`)
  }

  /**
   * 订阅状态变化 - 用于 useSyncExternalStore
   * @returns 取消订阅的函数
   */
  public subscribe(listener: ExtensionStatusListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 获取单个 Extension 状态
   */
  public getExtensionStatus(id: string): ExtensionStatus | null {
    return this.statuses.get(id) || null
  }

  /**
   * 获取所有 Extension 状态
   */
  public getAllExtensionStatuses(): Map<string, ExtensionStatus> {
    return new Map(this.statuses)
  }

  /**
   * 启动 Extension
   */
  public async startExtension(id: string): Promise<void> {
    await this.ready

    const extension = this.extensions.get(id)
    if (!extension) {
      throw new Error(`Extension '${id}' not found`)
    }

    await this.startExtensionInstance(extension)
  }

  /**
   * 实际执行 Extension 启动逻辑，避免初始化阶段的递归等待
   */
  private async startExtensionInstance(extension: Extension): Promise<void> {
    // 设置为连接中状态
    this.setExtensionConnecting(extension)

    try {
      // 调用 extension 的 start 方法
      const result = await extension.start()

      // 根据结果更新状态
      if (result.success) {
        this.setExtensionConnected(extension, result.tools || [])
      } else if (result.reason) {
        this.setExtensionIdle(extension, result.reason)
      } else {
        this.setExtensionError(extension, result.error || 'Start failed')
      }
    } catch (error) {
      this.setExtensionError(extension, error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 停用 Extension
   */
  public async stopExtension(id: string): Promise<void> {
    await this.ready

    const extension = this.extensions.get(id)
    if (!extension) {
      throw new Error(`Extension '${id}' not found`)
    }

    try {
      // 调用 extension 的 stop 方法（如果有）
      if (extension.stop) {
        await extension.stop()
      }
      this.setExtensionDisabled(extension)
    } catch (error) {
      this.setExtensionError(extension, error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 删除 Extension
   */
  public async deleteExtension(id: string): Promise<void> {
    await this.ready

    const extension = this.extensions.get(id)
    if (!extension) {
      logger.warn(`Extension ${id} not found`)
      return
    }

    // 停止服务器
    await this.stopExtension(id)

    // 从 extensions 移除
    this.extensions.delete(id)

    // 从状态中移除
    if (this.statuses.has(id)) {
      const statuses = new Map(this.statuses)
      statuses.delete(id)
      this.statuses = statuses
      this.notifyChange(id)
    }

    logger.debug('Extension deleted', { extensionId: id })
  }

  /**
   * 获取 Extension 实例（内部使用）
   */
  private getExtension(id: string): Extension | undefined {
    return this.extensions.get(id)
  }

  /**
   * 获取指定的 MCP server（便捷方法）
   */
  public async getMCPServer(serverId: string) {
    await this.ready
    const server = this.getExtension(serverId)
    if (!server) {
      throw new Error(`Extension ${serverId} not found`)
    }
    if (server.type !== 'mcp') {
      throw new Error(`Extension ${serverId} is not an MCP server`)
    }
    return server
  }

  /**
   * 添加或更新 MCP server（便捷方法）
   */
  public async upsertMCPServer(serverConfig: MCPServerBuilderConfig): Promise<void> {
    await this.ready

    const builder = getBuilderByType(serverConfig.id, serverConfig.type)
    const extension = builder.buildMCPServer(serverConfig)

    // 如果已存在，先删除
    if (this.extensions.has(extension.id)) {
      await this.deleteExtension(extension.id)
    }

    // 注册并启动
    await this.registerAndStartExtension(extension, serverConfig.enabled)
  }

  /**
   * 删除 MCP server（便捷方法）
   */
  public async deleteMCPServer(serverId: string): Promise<void> {
    await this.deleteExtension(serverId)
  }

  /**
   * 设置 Extension 为连接中状态
   */
  private setExtensionConnecting(extension: Extension): void {
    const statuses = new Map(this.statuses)
    statuses.set(extension.id, {
      id: extension.id,
      name: extension.name,
      type: extension.type,
      connectionStatus: ConnectionStatus.Connecting,
      extensionTools: [],
      isReady: false,
      issues: [],
      lastUpdated: Date.now(),
    })
    this.statuses = statuses
    this.notifyChange(extension.id)

    logger.debug('Extension status set to Connecting', {
      extensionId: extension.id,
      type: extension.type,
    })
  }

  /**
   * 设置 Extension 为空闲状态
   */
  private setExtensionIdle(extension: Extension, reason: string): void {
    const statuses = new Map(this.statuses)
    statuses.set(extension.id, {
      id: extension.id,
      name: extension.name,
      type: extension.type,
      connectionStatus: ConnectionStatus.Idle,
      extensionTools: [],
      isReady: false,
      issues: [reason],
      lastUpdated: Date.now(),
    })
    this.statuses = statuses
    this.notifyChange(extension.id)

    logger.debug('Extension status set to Idle', {
      extensionId: extension.id,
      type: extension.type,
      reason,
    })
  }

  /**
   * 设置 Extension 为已连接状态
   */
  private setExtensionConnected(extension: Extension, tools: any[]): void {
    const statuses = new Map(this.statuses)
    statuses.set(extension.id, {
      id: extension.id,
      name: extension.name,
      type: extension.type,
      connectionStatus: ConnectionStatus.Connected,
      extensionTools: tools,
      isReady: true,
      issues: [],
      lastUpdated: Date.now(),
    })
    this.statuses = statuses
    this.notifyChange(extension.id)

    logger.debug('Extension status set to Connected', {
      extensionId: extension.id,
      type: extension.type,
      toolCount: tools.length,
    })
  }

  /**
   * 设置 Extension 为错误状态
   */
  private setExtensionError(extension: Extension, error: string): void {
    const statuses = new Map(this.statuses)
    statuses.set(extension.id, {
      id: extension.id,
      name: extension.name,
      type: extension.type,
      connectionStatus: ConnectionStatus.Error,
      extensionTools: [],
      isReady: false,
      issues: [error],
      lastUpdated: Date.now(),
    })
    this.statuses = statuses
    this.notifyChange(extension.id)

    logger.debug('Extension status set to Error', {
      extensionId: extension.id,
      type: extension.type,
      error,
    })
  }

  /**
   * 设置 Extension 为禁用状态
   */
  private setExtensionDisabled(extension: Extension): void {
    const statuses = new Map(this.statuses)
    statuses.set(extension.id, {
      id: extension.id,
      name: extension.name,
      type: extension.type,
      connectionStatus: ConnectionStatus.Disabled,
      extensionTools: [],
      isReady: true,
      issues: [],
      lastUpdated: Date.now(),
    })
    this.statuses = statuses
    this.notifyChange(extension.id)

    logger.debug('Extension status set to Disabled', {
      extensionId: extension.id,
      type: extension.type,
    })
  }

  /**
   * 通知订阅者特定 extension 的状态已变化
   */
  private notifyChange(extensionId: string): void {
    this.listeners.forEach((listener) => listener(extensionId))
  }
}

// 导出单例
export const extensionService = new ExtensionService()

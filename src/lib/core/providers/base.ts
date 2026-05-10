import { Model } from '@/lib/core/providers/types'
import { SecureKVStore } from '@/lib/tauri/storage/secure-kv'
import { logger } from '@/lib/core/utils/logger'
import { Message } from '@/lib/core/messages/types'
import { ExtensionTool } from '@/lib/core/extensions/types'
import { modelsApi } from '@/lib/tauri/service/models'
import { CustomConfig } from '../agent/types'
import { ConfigSchema } from '../config/types'
import { eventBus } from '../events/event-bus'
import { Chunk, MessageEventType, StreamEvent } from '../events/message'

// Special model ID for creating new models
export const CREATE_MODEL_ID = '__create_model__'

// Placeholder model for "create new model" action
const CREATE_MODEL_PLACEHOLDER: Model = {
  id: CREATE_MODEL_ID,
  name: '+ Add Model',
  attachment: false,
  reasoning: false,
  toolCall: false,
  temperature: false,
  knowledge: '',
  releaseDate: '',
  lastUpdated: '',
  modalities: { input: [], output: [] },
  openWeights: false,
  cost: { input: 0, output: 0 },
  limit: { context: 0, output: 0 },
}

export interface TaskContext {
  taskId: string
  sessionId: string
  agentId: string
  queryId: number
  round: number
}

export interface TaskHooks {
  onSuccess: () => void
  onError: (error: Error) => void
  onPendingApproval: () => void
}

// Provider 请求参数 - 与 OpenAI SDK 解耦
export interface Request {
  model: string
  customConfig?: CustomConfig
  systemPrompt?: string
  messages: Message[]
  tools: ExtensionTool[]
  context: TaskContext // Task 上下文，用于构建 StreamEvent
  signal?: AbortSignal // 用于取消请求
  hooks: TaskHooks // 任务生命周期回调
}

// Provider 基础配置
export interface ProviderMeta {
  id: string
  name: string
  avatar: string
  type?: 'openai' | 'anthropic'
  isCustom?: boolean
}

// Base class
export abstract class Provider {
  public readonly ready: Promise<void>
  protected configStore: SecureKVStore
  protected _models: Model[] = []
  protected _config: Record<string, unknown> | null = null
  protected readonly meta: ProviderMeta

  public abstract get helpUrl(): string
  public abstract get baseUrl(): string
  public abstract get configSchema(): ConfigSchema
  public abstract get configured(): boolean

  constructor(meta: ProviderMeta) {
    this.meta = meta
    this.configStore = new SecureKVStore({ service: 'bunshin-config' })
    // 延迟执行，确保子类构造函数完成后再执行 initialize
    this.ready = new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          await this.initialize()
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 0)
    })
  }

  get id(): string {
    return this.meta.id
  }

  get name(): string {
    return this.meta.name
  }

  get avatar(): string {
    return this.meta.avatar
  }

  get isCustom(): boolean {
    return this.meta.isCustom ?? false
  }

  get type(): 'openai' | 'anthropic' | undefined {
    return this.meta.type
  }

  /**
   * 初始化方法，子类可以重载此方法来自定义初始化逻辑
   */
  protected async initialize(): Promise<void> {
    try {
      const savedConfig = await this.configStore.getSecret(this.id)
      if (savedConfig) {
        this._config = JSON.parse(savedConfig)
      }
      this._models = await modelsApi.getModelsByProvider(this.id)
    } catch (error) {
      logger.error(`Failed to load models for ${this.id}`, error)
      this._models = []
    }
  }

  public get models(): Model[] {
    // 只有自定义 provider 才显示"添加新模型"选项
    if (this.isCustom) {
      return [...this._models, CREATE_MODEL_PLACEHOLDER]
    }
    return this._models
  }

  /**
   * Reload models from database
   * Call this after creating/updating/deleting models
   */
  public async reloadModels(): Promise<void> {
    try {
      this._models = await modelsApi.getModelsByProvider(this.id)
    } catch (error) {
      logger.error(`Failed to reload models for ${this.id}`, error)
      // Keep existing models on error
    }
  }

  public get config(): Record<string, unknown> {
    if (!this._config) {
      const defaultConfig: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(this.configSchema)) {
        if (field.default !== undefined) {
          defaultConfig[key] = field.default
        } else if (field.type === 'string') {
          defaultConfig[key] = ''
        }
      }
      return defaultConfig
    }
    return this._config
  }

  public async updateConfig(config: Record<string, unknown>): Promise<void> {
    await this.ready
    await this.configStore.setSecret(this.id, JSON.stringify(config))
    this._config = config
  }

  /**
   * 执行请求 - 子类必须实现
   * 通过 hooks 回调通知任务状态变化
   */
  public abstract run(request: Request): Promise<void>

  /**
   * 发送 chunk 到 eventBus（同步，保证顺序）
   */
  protected emitChunk(context: TaskContext, data: Chunk): void {
    const timestamp = Date.now()
    const event: StreamEvent = {
      sessionId: context.sessionId,
      agentId: context.agentId,
      queryId: context.queryId,
      round: context.round,
      created: timestamp,
      chunk: {
        messageId: context.taskId,
        timestamp,
        data,
      },
    }
    eventBus.emit(MessageEventType.StreamEvent, event)
  }
}

import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from './openai'
import { Model } from '../types'
import { logger } from '@/lib/core/utils/logger'
import { http } from '@/lib/tauri/system/http'

interface OllamaModel {
  name: string
  modified_at: string
  size: number
  details?: {
    family?: string
    parameter_size?: string
  }
}

interface OllamaTagsResponse {
  models: OllamaModel[]
}

export class OllamaProvider extends OpenAIProvider {
  constructor() {
    super({ id: 'ollama', name: 'Ollama', avatar: 'ollama' })
  }

  get helpUrl(): string {
    return 'https://ollama.com/'
  }

  get configSchema(): ConfigSchema {
    return {
      baseUrl: {
        type: 'string',
        label: 'Base URL',
        placeholder: 'http://localhost:11434',
        description: 'Ollama server URL',
        required: true,
      },
    }
  }

  get apiKey(): string {
    return ''
  }

  private get ollamaBaseUrl(): string {
    return (this.config.baseUrl as string) || 'http://localhost:11434'
  }

  get baseUrl(): string {
    return `${this.ollamaBaseUrl}/v1`
  }

  get configured(): boolean {
    return !!this.config.baseUrl
  }

  /**
   * 重载初始化方法，从 Ollama API 获取模型而不是数据库
   */
  protected async initialize(): Promise<void> {
    try {
      const savedConfig = await this.configStore.getSecret(this.id)
      if (savedConfig) {
        this._config = JSON.parse(savedConfig)
      }
      await this.reloadModels()
    } catch (error) {
      logger.error(`Failed to initialize Ollama provider`, error)
      this._models = []
    }
  }

  /**
   * 从 Ollama 本地获取已安装的模型列表
   */
  public async reloadModels(): Promise<void> {
    try {
      const response = await http.fetch(`${this.ollamaBaseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = (await response.json()) as OllamaTagsResponse

      this._models = data.models.map(
        (m): Model => ({
          id: m.name,
          name: m.name,
          attachment: true,
          reasoning: false,
          toolCall: true,
          temperature: true,
          knowledge: '',
          releaseDate: '',
          lastUpdated: m.modified_at,
          modalities: { input: ['text'], output: ['text'] },
          openWeights: true,
          cost: { input: 0, output: 0 },
          limit: { context: 0, output: 0 },
        }),
      )
    } catch (error) {
      logger.error('Failed to load Ollama models', error)
      this._models = []
    }
  }
}

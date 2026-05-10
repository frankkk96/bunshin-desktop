import { ConfigSchema } from '../../config/types'
import { Provider, Request } from '../base'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'

// 内部委托类 - OpenAI 兼容
class AzureOpenAIDelegate extends OpenAIProvider {
  private azureConfig: () => Record<string, unknown>

  constructor(getConfig: () => Record<string, unknown>) {
    super({ id: 'azure-openai-delegate', name: 'Azure OpenAI Delegate', avatar: 'azure' })
    this.azureConfig = getConfig
  }

  get baseUrl(): string {
    const resourceName = this.azureConfig().resourceName as string
    if (!resourceName) return ''
    return `https://${resourceName}.cognitiveservices.azure.com/openai/v1/`
  }

  get config(): Record<string, unknown> {
    return this.azureConfig()
  }

  get configured(): boolean {
    const cfg = this.azureConfig()
    return !!cfg.resourceName && !!cfg.apiKey
  }
}

// 内部委托类 - Anthropic 兼容
class AzureAnthropicDelegate extends AnthropicProvider {
  private azureConfig: () => Record<string, unknown>

  constructor(getConfig: () => Record<string, unknown>) {
    super({ id: 'azure-anthropic-delegate', name: 'Azure Anthropic Delegate', avatar: 'azure' })
    this.azureConfig = getConfig
  }

  get baseUrl(): string {
    const resourceName = this.azureConfig().resourceName as string
    if (!resourceName) return ''
    return `https://${resourceName}.services.ai.azure.com/anthropic/`
  }

  get config(): Record<string, unknown> {
    return this.azureConfig()
  }

  get configured(): boolean {
    const cfg = this.azureConfig()
    return !!cfg.resourceName && !!cfg.apiKey
  }
}

// Azure Foundry Provider - 支持 OpenAI 和 Anthropic 模型
export class AzureFoundryProvider extends Provider {
  private openaiDelegate: AzureOpenAIDelegate
  private anthropicDelegate: AzureAnthropicDelegate

  constructor() {
    super({ id: 'azure', name: 'Azure Foundry', avatar: 'azure' })
    this.openaiDelegate = new AzureOpenAIDelegate(() => this.config)
    this.anthropicDelegate = new AzureAnthropicDelegate(() => this.config)
  }

  get helpUrl(): string {
    return 'https://ai.azure.com/resource/deployments'
  }

  get configSchema(): ConfigSchema {
    return {
      resourceName: {
        type: 'string',
        label: 'Resource Name',
        placeholder: 'your-resource-name',
        required: true,
        description: 'Your Azure resource name',
      },
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'your-api-key',
        required: true,
        description: 'Your Azure API key',
      },
    }
  }

  get baseUrl(): string {
    const resourceName = this.config.resourceName as string
    if (!resourceName) return ''
    return `https://${resourceName}.openai.azure.com/openai/v1`
  }

  get configured(): boolean {
    return !!this.config.resourceName && !!this.config.apiKey
  }

  private isClaudeModel(modelId: string): boolean {
    return modelId.toLowerCase().includes('claude')
  }

  public async run(request: Request): Promise<void> {
    await this.ready

    if (this.isClaudeModel(request.model)) {
      return this.anthropicDelegate.run(request)
    }
    return this.openaiDelegate.run(request)
  }
}

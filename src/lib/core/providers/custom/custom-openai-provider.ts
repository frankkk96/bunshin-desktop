import { ConfigSchema } from '../../config/types'
import { OpenAIProvider } from '../builtin/openai'
import { ProviderMeta } from '../base'

/**
 * Custom OpenAI Compatible Provider
 * Extends OpenAIProvider with user-defined configuration
 */
export class CustomOpenAIProvider extends OpenAIProvider {
  constructor(meta: ProviderMeta) {
    super({
      ...meta,
      isCustom: true,
    })
  }

  get helpUrl(): string {
    return ''
  }

  get configSchema(): ConfigSchema {
    return {
      baseUrl: {
        type: 'string',
        label: 'Base URL',
        placeholder: 'https://api.example.com/v1',
        description: 'OpenAI compatible API base URL',
        required: true,
      },
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-...',
        description: 'OpenAI compatible API key',
        required: true,
      },
    }
  }

  get baseUrl(): string {
    return (this.config.baseUrl as string) || 'https://api.openai.com/v1'
  }

  get configured(): boolean {
    return !!this.config.apiKey && !!this.config.baseUrl
  }
}

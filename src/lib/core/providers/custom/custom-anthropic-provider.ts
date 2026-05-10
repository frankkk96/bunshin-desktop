import { ConfigSchema } from '../../config/types'
import { AnthropicProvider } from '../builtin/anthropic'
import { ProviderMeta } from '../base'

/**
 * Custom Anthropic Compatible Provider
 * Extends AnthropicProvider with user-defined configuration
 */
export class CustomAnthropicProvider extends AnthropicProvider {
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
        placeholder: 'https://api.anthropic.com',
        description: 'Anthropic compatible API base URL',
        required: true,
      },
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-ant-...',
        description: 'Anthropic compatible API key',
        required: true,
      },
    }
  }

  get baseUrl(): string {
    return (this.config.baseUrl as string) || 'https://api.anthropic.com'
  }

  get configured(): boolean {
    return !!this.config.apiKey && !!this.config.baseUrl
  }
}
